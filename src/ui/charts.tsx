import { useEffect, useMemo, useRef, useState } from 'react';
import { diffDays, fmtDate } from '../lib/dates';
import type { Forecast, ForecastEvent } from '../lib/forecast';
import type { YMD } from '../lib/types';

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const compact = (n: number, cur = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', notation: 'compact', maximumFractionDigits: 1 }).format(n);

function niceTicks(min: number, max: number, count = 3): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(Math.abs(v) < step / 1000 ? 0 : v);
  return out;
}

/* ───────── Forecast chart ───────── */
interface FProps {
  fc: Forecast;
  fmt: (n: number) => string;
  currency?: string;
  buffer?: number;
  whatIf?: { amount: number; date: YMD };
  height?: number;
  tone?: 'card' | 'hero';
  minimal?: boolean;
}

export function ForecastChart({ fc, fmt, currency, buffer, whatIf, height = 280, tone = 'card', minimal }: FProps) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = fc.days.length - 1;
  const padL = minimal ? 6 : 8, padR = 10, padT = 22, padB = minimal ? 8 : 28;
  const cw = Math.max(10, w - padL - padR), ch = height - padT - padB;

  const wi = useMemo(() => {
    if (!whatIf) return null;
    const idx = Math.max(0, Math.min(n, diffDays(whatIf.date, fc.today)));
    return { idx, series: fc.days.map((d, i) => (i >= idx ? d.balance - whatIf.amount : null)) };
  }, [whatIf, fc, n]);

  const { min, max } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const d of fc.days) { lo = Math.min(lo, d.balance); hi = Math.max(hi, d.balance); }
    if (wi) for (const v of wi.series) if (v !== null) lo = Math.min(lo, v);
    if (buffer !== undefined && !minimal) { lo = Math.min(lo, buffer); hi = Math.max(hi, buffer); }
    const pad = (hi - lo || 100) * 0.12;
    return { min: lo - pad, max: hi + pad };
  }, [fc, wi, buffer, minimal]);

  const x = (i: number) => padL + (i / Math.max(1, n)) * cw;
  const y = (v: number) => padT + (1 - (v - min) / (max - min || 1)) * ch;
  const line = fc.days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.balance).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n)},${padT + ch} L${x(0)},${padT + ch} Z`;
  const wiPath = wi ? fc.days.map((d, i) => (i < wi.idx ? '' : `${i === wi.idx ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.balance - whatIf!.amount).toFixed(1)}`)).join(' ') : '';
  const ticks = niceTicks(min, max, 3);
  const xTicks = useMemo(() => {
    const k = w < 480 ? 3 : 5;
    return Array.from({ length: k }, (_, j) => Math.round((j / (k - 1)) * n));
  }, [w, n]);

  const markers: { i: number; e: ForecastEvent }[] = [];
  fc.days.forEach((d, i) => d.events.forEach((e) => { if (e.kind === 'income' || -e.amount >= 100) markers.push({ i, e }); }));

  const onMove = (ev: React.PointerEvent) => {
    const rect = (ev.currentTarget as SVGElement).getBoundingClientRect();
    const i = Math.round(((ev.clientX - rect.left - padL) / cw) * n);
    setHover(Math.max(0, Math.min(n, i)));
  };

  const lowI = fc.low.index;
  const hovered = hover !== null ? fc.days[hover] : null;
  const gid = `fg-${tone}`;
  const cur = currency ?? 'USD';
  const flip = hover !== null && x(hover) > w * 0.62;

  return (
    <div ref={ref} className={`fchart t-${tone}`} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y', display: 'block' }} role="img" aria-label="Projected balance">
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--fc-line)" stopOpacity={tone === 'hero' ? 0.35 : 0.22} />
              <stop offset="1" stopColor="var(--fc-line)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {!minimal && ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className={t === 0 ? 'fc-zero' : 'fc-grid'} />
              <text x={padL + 2} y={y(t) - 5} className="fc-axis">{compact(t, cur)}</text>
            </g>
          ))}
          {!minimal && min < 0 && max > 0 && <line x1={padL} x2={w - padR} y1={y(0)} y2={y(0)} className="fc-zero" />}
          {buffer !== undefined && !minimal && buffer > min && buffer < max && (
            <g>
              <line x1={padL} x2={w - padR} y1={y(buffer)} y2={y(buffer)} className="fc-buffer" />
              <text x={w - padR - 2} y={y(buffer) - 5} textAnchor="end" className="fc-axis">cushion</text>
            </g>
          )}
          <path d={area} fill={`url(#${gid})`} />
          <path d={line} className="fc-line" />
          {wi && <path d={wiPath} className="fc-whatif" />}
          {wi && <circle cx={x(wi.idx)} cy={y(fc.days[wi.idx].balance - whatIf!.amount)} r={5} className="fc-whatif-dot" />}

          {!minimal && markers.map(({ i, e }, k) => (
            <circle key={k} cx={x(i)} cy={y(fc.days[i].balance)} r={e.amount > 0 ? 4.5 : 3.5} className={e.amount > 0 ? 'fc-in' : 'fc-out'} />
          ))}

          {/* lowest point */}
          <g>
            <circle cx={x(lowI)} cy={y(fc.low.balance)} r={9} className="fc-low-halo" />
            <circle cx={x(lowI)} cy={y(fc.low.balance)} r={4.5} className="fc-low" />
            {!minimal && (
              <text x={Math.min(Math.max(x(lowI), 70), w - 70)} y={y(fc.low.balance) + 26} textAnchor="middle" className="fc-low-label">
                Low {fmt(fc.low.balance)} · {fmtDate(fc.low.date)}
              </text>
            )}
          </g>

          {!minimal && xTicks.map((i) => (
            <text key={i} x={Math.min(Math.max(x(i), 22), w - 22)} y={height - 8} textAnchor="middle" className="fc-axis">{fmtDate(fc.days[i].date)}</text>
          ))}

          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={padT - 6} y2={padT + ch} className="fc-cursor" />
              <circle cx={x(hover)} cy={y(fc.days[hover].balance)} r={5.5} className="fc-cursor-dot" />
            </g>
          )}
        </svg>
      )}
      {hovered && hover !== null && (
        <div className="fc-tip" style={{ left: flip ? undefined : x(hover) + 12, right: flip ? w - x(hover) + 12 : undefined, top: 6 }}>
          <b>{fmtDate(hovered.date, 'EEE, MMM d')}</b>
          <span className="num big">{fmt(hovered.balance)}</span>
          {wi && hover >= wi.idx && <span className="num" style={{ color: 'var(--neg)' }}>after purchase {fmt(hovered.balance - whatIf!.amount)}</span>}
          {hovered.events.map((e, i) => (
            <span key={i} className={e.amount > 0 ? 'ev in' : 'ev out'}>{e.amount > 0 ? '+' : '−'}{fmt(Math.abs(e.amount))} {e.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Donut ───────── */
export function Donut({ items, size = 168, thickness = 22, children }: { items: { value: number; color: string; label?: string }[]; size?: number; thickness?: number; children?: React.ReactNode }) {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r, gap = items.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {items.map((it, k) => {
          const len = (Math.max(0, it.value) / total) * c;
          const seg = <circle key={k} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={it.color} strokeWidth={thickness} strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-offset} style={{ transition: 'stroke-dasharray .8s cubic-bezier(.2,.8,.2,1)' }}><title>{it.label}</title></circle>;
          offset += len;
          return seg;
        })}
      </svg>
      <span style={{ position: 'relative', textAlign: 'center', display: 'grid', placeItems: 'center' }}>{children}</span>
    </span>
  );
}

/* ───────── Value-over-time chart (investments) ───────── */
export interface TrendPoint { date: YMD; value: number; invested: number; }
export function TrendChart({ points, fmt, currency, height = 240 }: { points: TrendPoint[]; fmt: (n: number) => string; currency?: string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 8, padR = 10, padT = 18, padB = 26;
  const n = points.length - 1;
  const cw = Math.max(10, w - padL - padR), ch = height - padT - padB;
  let lo = Infinity, hi = -Infinity;
  for (const p of points) { lo = Math.min(lo, p.value, p.invested); hi = Math.max(hi, p.value, p.invested); }
  const pad = (hi - lo || 100) * 0.15; lo -= pad; hi += pad;
  const x = (i: number) => padL + (n ? i / n : 0.5) * cw;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * ch;
  const path = (k: 'value' | 'invested') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const ticks = niceTicks(lo, hi, 3);
  const cur = currency ?? 'USD';
  const onMove = (ev: React.PointerEvent) => {
    const rect = (ev.currentTarget as SVGElement).getBoundingClientRect();
    setHover(Math.max(0, Math.min(n, Math.round(((ev.clientX - rect.left - padL) / cw) * n))));
  };
  const hp = hover !== null ? points[hover] : null;
  return (
    <div ref={ref} className="fchart card-tone" style={{ height }}>
      {w > 0 && points.length > 0 && (
        <svg width={w} height={height} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y', display: 'block' }}>
          <defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--fc-line)" stopOpacity=".22" /><stop offset="1" stopColor="var(--fc-line)" stopOpacity="0" /></linearGradient></defs>
          {ticks.map((t) => (<g key={t}><line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="fc-grid" /><text x={padL + 2} y={y(t) - 5} className="fc-axis">{compact(t, cur)}</text></g>))}
          <path d={`${path('value')} L${x(n)},${padT + ch} L${x(0)},${padT + ch} Z`} fill="url(#tg)" />
          <path d={path('invested')} className="fc-buffer" style={{ strokeWidth: 2 }} />
          <path d={path('value')} className="fc-line" />
          <circle cx={x(n)} cy={y(points[n].value)} r={5} className="fc-low" />
          {[0, Math.floor(n / 2), n].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
            <text key={i} x={Math.min(Math.max(x(i), 24), w - 24)} y={height - 8} textAnchor="middle" className="fc-axis">{fmtDate(points[i].date, 'MMM yyyy')}</text>
          ))}
          {hover !== null && <g pointerEvents="none"><line x1={x(hover)} x2={x(hover)} y1={padT - 4} y2={padT + ch} className="fc-cursor" /><circle cx={x(hover)} cy={y(points[hover].value)} r={5.5} className="fc-cursor-dot" /></g>}
        </svg>
      )}
      {hp && hover !== null && (
        <div className="fc-tip" style={{ left: x(hover) > w * 0.6 ? undefined : x(hover) + 12, right: x(hover) > w * 0.6 ? w - x(hover) + 12 : undefined, top: 4 }}>
          <b>{fmtDate(hp.date, 'MMM d, yyyy')}</b>
          <span className="num big">{fmt(hp.value)}</span>
          <span className="num muted">invested {fmt(hp.invested)}</span>
          <span className={`num ${hp.value - hp.invested >= 0 ? 'pos' : 'neg'}`}>{hp.value - hp.invested >= 0 ? '+' : '−'}{fmt(Math.abs(hp.value - hp.invested))}</span>
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, color = 'var(--accent)', width = 90, height = 32 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 3 - ((v - lo) / (hi - lo || 1)) * (height - 6)).toFixed(1)}`).join(' ');
  return <svg width={width} height={height} aria-hidden="true"><path d={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
