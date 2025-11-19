export interface UserProfile {
  id: string;
  name: string;
  currency: string;
  currentBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextPaymentDate: Date;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'subscription';
  amount: number;
  description: string;
  subscriptionId?: string;
  date: Date;
  createdAt: Date;
}

export interface Alert {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  amount: number;
  dueDate: Date;
  daysUntilDue: number;
  dismissed: boolean;
  createdAt: Date;
}

export type BillingCycleOption = {
  value: Subscription['billingCycle'];
  label: string;
};

export const BILLING_CYCLES: BillingCycleOption[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
};

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'INR', label: 'Indian Rupee (₹)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
];
