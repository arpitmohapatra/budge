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
  category?: string;
  subcategory?: string;
  subscriptionId?: string;
  incomeSourceId?: string;
  notes?: string;
  tags?: string[];
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

// Expense and Income Categories
export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  color?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  isRecurring: boolean;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  nextDate?: Date;
  categoryId?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics and Statistics
export interface MonthlySummary {
  month: string; // YYYY-MM format
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  categoryBreakdown: CategorySpending[];
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  budgetLimit?: number;
  transactionCount: number;
}

export interface TransactionFilters {
  type?: 'income' | 'expense' | 'subscription';
  category?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Default Categories
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'Utensils', color: '#ef4444' },
  { name: 'Transportation', icon: 'Car', color: '#3b82f6' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#8b5cf6' },
  { name: 'Entertainment', icon: 'Film', color: '#ec4899' },
  { name: 'Bills & Utilities', icon: 'Receipt', color: '#f59e0b' },
  { name: 'Healthcare', icon: 'Heart', color: '#10b981' },
  { name: 'Education', icon: 'GraduationCap', color: '#6366f1' },
  { name: 'Travel', icon: 'Plane', color: '#14b8a6' },
  { name: 'Personal Care', icon: 'Sparkles', color: '#f43f5e' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10b981' },
  { name: 'Freelance', icon: 'Code', color: '#3b82f6' },
  { name: 'Investment', icon: 'TrendingUp', color: '#8b5cf6' },
  { name: 'Business', icon: 'Store', color: '#f59e0b' },
  { name: 'Gift', icon: 'Gift', color: '#ec4899' },
  { name: 'Other', icon: 'DollarSign', color: '#6b7280' },
];
