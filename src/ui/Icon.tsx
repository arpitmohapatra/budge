import {
  AlertOctagon, AlertTriangle, ArrowLeftRight, Baby, Banknote, Bitcoin, Briefcase, Building2, CalendarDays, Car, CircleDollarSign, Coins,
  CreditCard, GraduationCap, Gift, HeartPulse, House, Landmark, Layers, LineChart, PartyPopper, PiggyBank, Plane, Repeat, ShieldCheck,
  ShoppingBag, ShoppingCart, Sparkles, Sprout, Sun, Target, Ticket, TrendingDown, TrendingUp, Utensils, Wallet, Zap, Mountain, Rocket, Landmark as Bank,
  type LucideIcon,
} from 'lucide-react';
import type { Account, Category, HoldingKind } from '../lib/types';

/** Every icon the data refers to by name lives here, so categories/insights stay serialisable. */
export const ICONS: Record<string, LucideIcon> = {
  cart: ShoppingCart, utensils: Utensils, home: House, zap: Zap, car: Car, repeat: Repeat, bag: ShoppingBag, health: HeartPulse,
  ticket: Ticket, plane: Plane, baby: Baby, grad: GraduationCap, cash: Banknote, shield: ShieldCheck, gift: Gift, landmark: Landmark,
  sparkles: Sparkles, briefcase: Briefcase, party: PartyPopper, sprout: Sprout, coins: Coins, alert: AlertOctagon, warn: AlertTriangle,
  sun: Sun, calendar: CalendarDays, card: CreditCard, target: Target, 'trend-down': TrendingDown, 'trend-up': TrendingUp,
  piggy: PiggyBank, wallet: Wallet, transfer: ArrowLeftRight, dollar: CircleDollarSign, line: LineChart, layers: Layers, bitcoin: Bitcoin,
  building: Building2, mountain: Mountain, rocket: Rocket, bank: Bank,
};

export function Icon({ name, size = 18, className, strokeWidth }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const C = ICONS[name] ?? Sparkles;
  return <C size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export function CatTile({ cat, size }: { cat?: Pick<Category, 'icon' | 'color'>; size?: 'sm' | 'lg' }) {
  return (
    <span className={`tile${size ? ' ' + size : ''}`} style={{ ['--c' as string]: cat?.color ?? '#8C8C99' }}>
      <Icon name={cat?.icon ?? 'sparkles'} />
    </span>
  );
}

export const ACCOUNT_KINDS: { value: Account['kind']; label: string; icon: string; hint: string; color: string }[] = [
  { value: 'checking', label: 'Checking', icon: 'bank', hint: 'Everyday bank account', color: '#2F74B5' },
  { value: 'savings', label: 'Savings', icon: 'piggy', hint: 'Rainy-day money', color: '#2A8A58' },
  { value: 'credit', label: 'Credit card', icon: 'card', hint: 'Owed balance & dues', color: '#C65E3B' },
  { value: 'cash', label: 'Cash', icon: 'wallet', hint: 'Wallet / on hand', color: '#7A8B3A' },
];
export const kindMeta = (k: Account['kind']) => ACCOUNT_KINDS.find((x) => x.value === k)!;

export const HOLDING_KINDS: { value: HoldingKind; label: string; icon: string; color: string }[] = [
  { value: 'retirement', label: '401(k) / IRA', icon: 'mountain', color: '#2F74B5' },
  { value: 'stocks', label: 'Stocks', icon: 'trend-up', color: '#2A8A58' },
  { value: 'etf', label: 'ETF', icon: 'layers', color: '#6B6FD6' },
  { value: 'mutual-fund', label: 'Mutual fund', icon: 'line', color: '#2E9AA6' },
  { value: 'crypto', label: 'Crypto', icon: 'bitcoin', color: '#D19A2A' },
  { value: 'property', label: 'Property', icon: 'building', color: '#C65E3B' },
  { value: 'other', label: 'Other', icon: 'rocket', color: '#8C8C99' },
];
export const holdingMeta = (k: HoldingKind) => HOLDING_KINDS.find((x) => x.value === k) ?? HOLDING_KINDS[HOLDING_KINDS.length - 1];
