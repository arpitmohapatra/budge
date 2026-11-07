import { useMemo } from 'react';
import { Minus, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { holdingGain, inScope, round2 } from '../lib/ledger';
import { useApp } from '../lib/store';
import type { Holding, Snapshot, YMD } from '../lib/types';
import { Donut, Sparkline, TrendChart, type TrendPoint } from '../ui/charts';
import { HOLDING_KINDS, Icon, holdingMeta } from '../ui/Icon';
import { CountUp, Empty, Owner } from '../ui/kit';
import { fmtDate } from '../lib/dates';

function seriesFor(hs: Holding[], today: YMD): TrendPoint[] {
  const dates = new Set<YMD>();
  for (const h of hs) for (const s of h.snapshots) dates.add(s.date);
  dates.add(today);
  const out: TrendPoint[] = [];
  for (const d of [...dates].sort()) {
    let value = 0, invested = 0, any = false;
    for (const h of hs) {
      let last: Snapshot | undefined;
      for (const s of h.snapshots) if (s.date <= d) last = s;
      if (d === today) { value += h.value; invested += h.invested; any = true; }
      else if (last) { value += last.value; invested += last.invested; any = true; }
    }
    if (any) out.push({ date: d, value: round2(value), invested: round2(invested) });
  }
  return out;
}

export default function Invest() {
  const { state, scope, today, fmt, fmt0, openModal } = useApp();
  const hs = inScope(state.holdings, scope).sort((a, b) => b.value - a.value);
  const value = hs.reduce((s, h) => s + h.value, 0);
  const invested = hs.reduce((s, h) => s + h.invested, 0);
  const gain = value - invested;
  const pct = invested ? gain / invested : 0;
  const points = useMemo(() => seriesFor(hs, today), [hs, today]);
  const first = points[0];
  const periodGain = first && points.length > 1 ? (value - first.value) - (invested - first.invested) : 0;
  const byKind = HOLDING_KINDS.map((k) => ({ ...k, v: hs.filter((h) => h.kind === k.value).reduce((s, h) => s + h.value, 0) })).filter((k) => k.v > 0);
  const multi = scope.length > 1;

  return (
    <>
      <div className="page-head reveal">
        <div className="titles">
          <h1 className="display">Investments</h1>
          <p className="subline">{hs.length ? <>Worth <b>{fmt0(value)}</b> · <b className={gain >= 0 ? 'pos' : 'neg'}>{gain >= 0 ? '+' : '−'}{fmt0(Math.abs(gain))} ({(pct * 100).toFixed(1)}%)</b> all-time</> : 'Track 401(k)s, brokerage, crypto — each person separately'}</p>
        </div>
        <div className="actions"><button className="btn primary" onClick={() => openModal('holding')}><Plus /> Add investment</button></div>
      </div>

      {hs.length === 0 ? (
        <Empty icon={<TrendingUp />} title="No investments yet" text="Add each account or fund with what you've put in and what it's worth today. Update the value whenever you check in — Budge charts the growth." action={<button className="btn primary" onClick={() => openModal('holding')}><Plus /> Add investment</button>} />
      ) : (
        <>
          <div className="split">
            <section className="card reveal" style={{ ['--d' as string]: '.05s' }}>
              <div className="card-head"><div><div className="eyebrow">Portfolio value</div><div className="num" style={{ fontSize: 40, fontWeight: 300, letterSpacing: '-.03em' }}><CountUp value={value} format={fmt0} /></div></div>
                <div className="legend"><span><i className="in" style={{ background: 'var(--accent)' }} />Value</span><span><i className="dash" />Invested</span></div></div>
              {points.length > 1 ? <TrendChart points={points} fmt={fmt0} currency={state.settings.currency} height={250} /> : <p className="help">Update values over time to see your growth curve.</p>}
              {points.length > 1 && <p className="help">Market growth since {fmtDate(first.date, 'MMM d')}: <b className={periodGain >= 0 ? 'pos' : 'neg'}>{periodGain >= 0 ? '+' : '−'}{fmt0(Math.abs(periodGain))}</b> (excludes new contributions).</p>}
            </section>
            <section className="card reveal" style={{ ['--d' as string]: '.1s' }}>
              <div className="card-head"><h3>Mix</h3></div>
              <div className="breakdown" style={{ gridTemplateColumns: '1fr', justifyItems: 'center' }}>
                <Donut size={170} items={byKind.map((k) => ({ value: k.v, color: k.color, label: k.label }))}><span><span className="eyebrow">Put in</span><br /><b className="num" style={{ fontSize: 20, fontWeight: 400 }}>{fmt0(invested)}</b></span></Donut>
                <div className="legend-list" style={{ width: '100%' }}>
                  {byKind.map((k) => (
                    <div key={k.value} className="legend-row" style={{ cursor: 'default' }}>
                      <span className="tile sm" style={{ ['--c' as string]: k.color }}><Icon name={k.icon} /></span>
                      <span className="t">{k.label}</span><span className="muted num" style={{ fontSize: 13 }}>{Math.round((k.v / value) * 100)}%</span><b className="num" style={{ fontWeight: 500, minWidth: 70, textAlign: 'right' }}>{fmt0(k.v)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {multi && (
            <div className="grid cols-2 reveal">
              {state.profiles.map((p) => {
                const mine = hs.filter((h) => h.profileId === p.id);
                const v = mine.reduce((s, h) => s + h.value, 0), inv = mine.reduce((s, h) => s + h.invested, 0);
                return <div key={p.id} className="card"><div className="card-head"><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Owner id={p.id} /><b style={{ fontWeight: 500 }}>{p.name}</b></span><span className={`pill ${v - inv >= 0 ? 'good' : 'bad'}`}>{v - inv >= 0 ? '+' : '−'}{fmt0(Math.abs(v - inv))}</span></div><div className="num" style={{ fontSize: 30, fontWeight: 300 }}>{fmt0(v)}</div><span className="help">{mine.length} holding{mine.length === 1 ? '' : 's'} · {fmt0(inv)} put in</span></div>;
              })}
            </div>
          )}

          <section className="card flush reveal" style={{ ['--d' as string]: '.15s' }}>
            <div className="list">
              {hs.map((h) => {
                const m = holdingMeta(h.kind);
                const g = holdingGain(h);
                return (
                  <div key={h.id} className="li holding">
                    <button className="tile lg" style={{ ['--c' as string]: m.color, border: 0, cursor: 'pointer' }} onClick={() => openModal('holding', { id: h.id })} aria-label={`Edit ${h.name}`}><Icon name={m.icon} /></button>
                    <span className="body">
                      <span className="t">{h.name}</span>
                      <span className="s">{multi && <Owner id={h.profileId} />}{m.label} · {fmt0(h.invested)} put in</span>
                      <span className="hold-actions">
                        <button className="btn small" onClick={() => openModal('holding-money', { id: h.id, mode: 'add' })}><Plus /> Add money</button>
                        <button className="btn small" onClick={() => openModal('holding-money', { id: h.id, mode: 'value' })}><RefreshCw /> Update value</button>
                      </span>
                    </span>
                    <span className="hide-sm-inline"><Sparkline values={h.snapshots.map((s) => s.value)} color={g >= 0 ? 'var(--pos)' : 'var(--neg)'} /></span>
                    <span className="amt num">{fmt(h.value)}<small className={g >= 0 ? 'pos' : 'neg'}>{g >= 0 ? <Plus size={10} /> : <Minus size={10} />}{fmt0(Math.abs(g))} · {h.invested ? ((g / h.invested) * 100).toFixed(1) : '0.0'}%</small></span>
                  </div>
                );
              })}
            </div>
          </section>
          <p className="help">Values are entered by you (no live market feed), so Budge keeps working fully offline and nothing leaves your device.</p>
        </>
      )}
    </>
  );
}
