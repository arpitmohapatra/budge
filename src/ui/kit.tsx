import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../lib/store';
import { parseYMD, toYMD } from '../lib/dates';
import type { Profile } from '../lib/types';
import { FAMILY } from '../lib/types';

/* ───────── Avatars ───────── */
export function Avatar({ profile, size, family }: { profile?: Profile; size?: 'sm' | 'lg'; family?: boolean }) {
  if (family) return <span className={`avatar family${size ? ' ' + size : ''}`}>F</span>;
  return <span className={`avatar${size ? ' ' + size : ''}`} style={{ ['--c' as string]: profile?.color }}>{(profile?.name ?? '?').trim().charAt(0).toUpperCase()}</span>;
}

export function Owner({ id }: { id: string }) {
  const { state } = useApp();
  const p = state.profiles.find((x) => x.id === id);
  return p ? <Avatar profile={p} size="sm" /> : null;
}

/* ───────── Profile switcher ───────── */
export function WhoSwitch({ variant }: { variant: 'side' | 'top' }) {
  const { state, view, setView } = useApp();
  const items = [{ id: FAMILY, name: 'Family', sub: 'Everyone together' }, ...state.profiles.map((p) => ({ id: p.id, name: p.name, sub: 'Personal' }))];
  if (variant === 'top') {
    return (
      <div className="seg" role="group" aria-label="Whose finances">
        {items.map((i) => (
          <button key={i.id} type="button" aria-pressed={view === i.id} onClick={() => setView(i.id)}>
            {i.id === FAMILY ? 'Family' : i.name}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="who" role="group" aria-label="Whose finances">
      <div className="eyebrow" style={{ padding: '0 12px 4px' }}>Viewing</div>
      {items.map((i) => (
        <button key={i.id} type="button" className="who-btn" aria-pressed={view === i.id} onClick={() => setView(i.id)}>
          {i.id === FAMILY ? <Avatar family /> : <Avatar profile={state.profiles.find((p) => p.id === i.id)} />}
          <span style={{ minWidth: 0 }}>{i.name}<small>{i.sub}</small></span>
        </button>
      ))}
    </div>
  );
}

/* ───────── Sheet ───────── */
export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      d.showModal();
      (d.querySelector('[data-af]') as HTMLElement | null)?.focus();
    }
    return () => { if (d?.open) d.close(); };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      style={wide ? { width: 'min(720px, calc(100vw - 32px))' } : undefined}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="dlg">
        <div className="dlg-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/* ───────── Form bits ───────── */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency');
    return part?.value ?? currency;
  } catch { return currency; }
}
const prefixPad = (sym: string) => `calc(${Math.max(1, sym.length) * 0.62}em + 22px)`;

export function MoneyInput({ value, onChange, autoFocus, placeholder = '0.00', label, hint, allowNegative }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; placeholder?: string; label?: string; hint?: string; allowNegative?: boolean }) {
  const { state } = useApp();
  const sym = currencySymbol(state.settings.currency);
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className="money-input">
        <span>{sym}</span>
        <input style={{ paddingLeft: prefixPad(sym) }} inputMode="decimal" data-af={autoFocus ? '1' : undefined} placeholder={placeholder} value={value} onChange={(e) => onChange(clean(e.target.value, allowNegative))} />
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function BigAmount({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const { state } = useApp();
  const sym = currencySymbol(state.settings.currency);
  return (
    <div className="big-amount">
      <span>{sym}</span>
      <input inputMode="decimal" data-af={autoFocus ? '1' : undefined} placeholder="0" aria-label="Amount" style={{ width: `${Math.max(1.4, value.length * 1.02 + 0.6)}ch` }} value={value} onChange={(e) => onChange(clean(e.target.value))} />
    </div>
  );
}

function clean(v: string, neg = false) {
  let s = v.replace(neg ? /[^0-9.\-]/g : /[^0-9.]/g, '');
  const i = s.indexOf('.');
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2);
  return s;
}
export const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (b: boolean) => void; label: string; sub?: string }) {
  return (
    <label className="switch">
      <span>{label}{sub && <small>{sub}</small>}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  );
}

export function Seg<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="em-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

/* ───────── Animated number ───────── */
export function CountUp({ value, format, duration = 900 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return; }
    const start = performance.now(), a = from.current, b = value;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - k, 4);
      setShown(a + (b - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    // rAF is paused in background tabs — make sure we always land on the real number.
    const settle = setTimeout(() => { setShown(b); from.current = b; }, duration + 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); from.current = b; };
  }, [value, duration]);
  return <>{format(shown)}</>;
}

/* ───────── Rings ───────── */
export function Ring({ pct, size = 64, stroke = 7, color = 'var(--accent)', children }: { pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>{children}</span>
    </span>
  );
}

/* ───────── Toasts & confetti ───────── */
export function ToastHost() {
  const { toasts } = useApp();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span>{t.msg}</span>
          {t.action && <button type="button" onClick={t.action.run}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

const COLORS = ['#2F74B5', '#2A8A58', '#D19A2A', '#C65E3B', '#8A7BD1', '#D9577A'];
export function Confetti() {
  const { burst } = useApp();
  const [show, setShow] = useState(0);
  useEffect(() => { if (burst) { setShow(burst); const t = setTimeout(() => setShow(0), 2200); return () => clearTimeout(t); } }, [burst]);
  if (!show || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  return (
    <div className="confetti" key={show} aria-hidden="true">
      {Array.from({ length: 34 }, (_, i) => {
        const ang = (Math.PI * 2 * i) / 34 + (i % 3) * 0.2;
        const dist = 160 + ((i * 53) % 220);
        return <i key={i} style={{ ['--c' as string]: COLORS[i % COLORS.length], ['--x' as string]: `${Math.cos(ang) * dist}px`, ['--y' as string]: `${Math.sin(ang) * dist * 0.9 + 140}px`, ['--r' as string]: `${(i * 97) % 720}deg`, ['--dl' as string]: `${(i % 6) * 0.02}s` } as React.CSSProperties} />;
      })}
    </div>
  );
}

/* ───────── Dates ───────── */
const isYMD = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && toYMD(parseYMD(v)) === v;

/**
 * Safari-safe date field. Safari (and iOS) emit '' or half-typed years while the picker/segments are being edited;
 * only well-formed dates inside [min, max] are passed up, so the rest of the app never sees a bad date.
 */
export function DateInput({ value, onChange, min = '2000-01-01', max = '2100-12-31', allowEmpty }: { value: string; onChange: (v: string) => void; min?: string; max?: string; allowEmpty?: boolean }) {
  const [raw, setRaw] = useState(value);
  useEffect(() => setRaw(value), [value]);
  return (
    <input
      type="date" value={raw} min={min} max={max}
      onChange={(e) => {
        const v = e.target.value;
        setRaw(v);
        if (v === '') { if (allowEmpty) onChange(''); }
        else if (isYMD(v) && v >= min && v <= max) onChange(v);
      }}
      onBlur={() => { if (raw !== value && !(raw === '' && allowEmpty)) setRaw(value); }}
    />
  );
}

/* ───────── Error boundary: a bad render never blanks the whole app ───────── */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string; onError?: () => void; compact?: boolean }, { err?: Error }> {
  state: { err?: Error } = {};
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error(err, info.componentStack); this.props.onError?.(); }
  componentDidUpdate(prev: { resetKey?: string }) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: undefined }); }
  render() {
    if (!this.state.err) return this.props.children;
    if (this.props.compact) return null;
    return (
      <div className="empty" role="alert">
        <h2>That page hit a snag</h2>
        <p>Your data is safe. Try again, or head back home.</p>
        <div className="actions">
          <button className="btn primary" onClick={() => this.setState({ err: undefined })}>Try again</button>
          <button className="btn" onClick={() => { location.hash = '/'; this.setState({ err: undefined }); }}>Go home</button>
        </div>
      </div>
    );
  }
}
