/** All dates are local calendar dates as 'YYYY-MM-DD' strings — no timezone surprises. */
export type YMD = string;

export interface Profile {
  id: string;
  name: string;
  color: string;
}

export type AccountKind = 'checking' | 'savings' | 'cash' | 'credit';

export interface Account {
  id: string;
  profileId: string;
  name: string;
  kind: AccountKind;
  /** Signed. Credit cards store what you owe as a NEGATIVE number. */
  startingBalance: number;
  /** Transactions dated before this don't move the balance (the balance is "as of" this day). */
  startDate: YMD;
  /** The account day-to-day spending is assumed to come out of. */
  primary?: boolean;
  /** Credit limit (cards only). */
  limit?: number;
  /** Bank charges a fee if the balance drops below this (checking/savings). */
  minBalance?: number;
  /** The fee itself, if known (informational — shown in warnings). */
  minFee?: number;
  last4?: string;
  archived?: boolean;
}

export type TxType = 'expense' | 'income' | 'transfer' | 'adjust';

export interface Transaction {
  id: string;
  profileId: string;
  type: TxType;
  /** Positive for expense/income/transfer. Signed for 'adjust'. */
  amount: number;
  date: YMD;
  accountId: string;
  /** Transfers: destination account (e.g. the credit card being paid). */
  toAccountId?: string;
  /** Transfers: destination investment holding. */
  toHoldingId?: string;
  categoryId?: string;
  note?: string;
  recurringId?: string;
  dueId?: string;
  createdAt: number;
}

export type Frequency = 'semimonthly' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Recurring {
  id: string;
  profileId: string;
  kind: 'income' | 'expense';
  name: string;
  amount: number;
  frequency: Frequency;
  /** Any date on the schedule (past or future). Occurrences are anchor + k·period. Ignored for 'semimonthly'. */
  anchor: YMD;
  /** 'semimonthly' only: the two days of the month it lands on, e.g. [7, 22]. */
  days?: [number, number];
  /** If a date falls on a weekend or holiday, pay it on the last business day before. */
  rollBack?: boolean;
  /** Everything on the schedule up to and including this day has already been posted. */
  postedThrough: YMD;
  /** Income lands in / expense is charged to this account. */
  accountId: string;
  categoryId?: string;
  endDate?: YMD;
  active: boolean;
}

/** A known payment due on a date — typically a credit-card statement. Paid from `payFromId` on the due date. */
export interface Due {
  id: string;
  profileId: string;
  name: string;
  amount: number;
  date: YMD;
  /** The card/loan being paid. Omit for a plain one-off bill (posted as an expense). */
  accountId?: string;
  /** The bank account the money comes out of. */
  payFromId: string;
  categoryId?: string;
  status: 'open' | 'paid' | 'skipped';
  txId?: string;
}

export interface Budget {
  id: string;
  profileId: string;
  categoryId: string;
  /** Monthly limit. */
  amount: number;
}

export type HoldingKind = 'stocks' | 'etf' | 'mutual-fund' | 'retirement' | 'crypto' | 'property' | 'other';

export interface Snapshot {
  date: YMD;
  value: number;
  invested: number;
}

export interface Holding {
  id: string;
  profileId: string;
  name: string;
  kind: HoldingKind;
  /** Total money put in (cost basis). */
  invested: number;
  /** Current market value. */
  value: number;
  snapshots: Snapshot[];
  createdAt: number;
}

export interface PlannedPurchase {
  id: string;
  /** A profile id, or 'family'. */
  scope: string;
  name: string;
  amount: number;
  date: YMD;
}

export interface Category {
  id: string;
  name: string;
  /** Key into the Lucide icon map (ui/Icon.tsx). */
  icon: string;
  color: string;
  kind: 'expense' | 'income';
}

export interface Settings {
  currency: string;
  /** Cushion that should never be spent — forecasts treat dipping below it as "tight". */
  buffer: number;
  /** Look-back window for "average spending". */
  windowDays: number;
  /** Manual per-day spending per profile id, overriding the computed average. */
  dailyOverride: Record<string, number>;
  includeSavings: boolean;
  theme: 'auto' | 'light' | 'dark';
}

export interface AppState {
  v: 2;
  onboarded: boolean;
  profiles: Profile[];
  accounts: Account[];
  transactions: Transaction[];
  recurring: Recurring[];
  dues: Due[];
  budgets: Budget[];
  holdings: Holding[];
  planned: PlannedPurchase[];
  categories: Category[];
  settings: Settings;
}

export type Scope = string[]; // list of profile ids in view

export const FAMILY = 'family';
