import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { UserProfile, Subscription, Transaction, Alert, Category, Budget, IncomeSource } from './types';

interface BudgeDB extends DBSchema {
  profile: {
    key: string;
    value: UserProfile;
  };
  subscriptions: {
    key: string;
    value: Subscription;
    indexes: { 'by-nextPayment': Date };
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-date': Date; 'by-subscription': string; 'by-category': string; 'by-type': string };
  };
  alerts: {
    key: string;
    value: Alert;
    indexes: { 'by-subscription': string; 'by-dismissed': number };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-type': string };
  };
  budgets: {
    key: string;
    value: Budget;
    indexes: { 'by-category': string };
  };
  incomeSources: {
    key: string;
    value: IncomeSource;
    indexes: { 'by-recurring': number; 'by-nextDate': Date };
  };
}

const DB_NAME = 'budge-db';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<BudgeDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<BudgeDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<BudgeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create profile store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }

      // Create subscriptions store
      if (!db.objectStoreNames.contains('subscriptions')) {
        const subscriptionStore = db.createObjectStore('subscriptions', { keyPath: 'id' });
        subscriptionStore.createIndex('by-nextPayment', 'nextPaymentDate');
      }

      // Create/update transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
        transactionStore.createIndex('by-date', 'date');
        transactionStore.createIndex('by-subscription', 'subscriptionId');
        transactionStore.createIndex('by-category', 'category');
        transactionStore.createIndex('by-type', 'type');
      }

      // Create alerts store
      if (!db.objectStoreNames.contains('alerts')) {
        const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertStore.createIndex('by-subscription', 'subscriptionId');
        alertStore.createIndex('by-dismissed', 'dismissed');
      }

      // Create categories store (v2)
      if (!db.objectStoreNames.contains('categories')) {
        const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
        categoryStore.createIndex('by-type', 'type');
      }

      // Create budgets store (v2)
      if (!db.objectStoreNames.contains('budgets')) {
        const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
        budgetStore.createIndex('by-category', 'categoryId');
      }

      // Create income sources store (v2)
      if (!db.objectStoreNames.contains('incomeSources')) {
        const incomeStore = db.createObjectStore('incomeSources', { keyPath: 'id' });
        incomeStore.createIndex('by-recurring', 'isRecurring');
        incomeStore.createIndex('by-nextDate', 'nextDate');
      }
    },
  });

  return dbInstance;
}

// Profile operations
export async function getProfile(): Promise<UserProfile | undefined> {
  const db = await initDB();
  const profiles = await db.getAll('profile');
  return profiles[0];
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await initDB();
  await db.put('profile', profile);
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
  const db = await initDB();
  const profile = await getProfile();
  if (profile) {
    await db.put('profile', { ...profile, ...updates, updatedAt: new Date() });
  }
}

// Subscription operations
export async function getAllSubscriptions(): Promise<Subscription[]> {
  const db = await initDB();
  return db.getAll('subscriptions');
}

export async function getSubscription(id: string): Promise<Subscription | undefined> {
  const db = await initDB();
  return db.get('subscriptions', id);
}

export async function addSubscription(subscription: Subscription): Promise<void> {
  const db = await initDB();
  await db.add('subscriptions', subscription);
}

export async function updateSubscription(subscription: Subscription): Promise<void> {
  const db = await initDB();
  await db.put('subscriptions', { ...subscription, updatedAt: new Date() });
}

export async function deleteSubscription(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('subscriptions', id);

  // Also delete related transactions and alerts
  const tx = db.transaction(['transactions', 'alerts'], 'readwrite');
  const transactions = await tx.objectStore('transactions').index('by-subscription').getAll(id);
  for (const transaction of transactions) {
    await db.delete('transactions', transaction.id);
  }
  const alerts = await tx.objectStore('alerts').index('by-subscription').getAll(id);
  for (const alert of alerts) {
    await db.delete('alerts', alert.id);
  }
}

export async function getUpcomingSubscriptions(days: number = 7): Promise<Subscription[]> {
  const db = await initDB();
  const allSubs = await db.getAll('subscriptions');
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return allSubs.filter(sub => {
    const nextPayment = new Date(sub.nextPaymentDate);
    return nextPayment >= now && nextPayment <= futureDate;
  }).sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
}

// Transaction operations
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await initDB();
  const transactions = await db.getAll('transactions');
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  const db = await initDB();
  await db.add('transactions', transaction);

  // Update balance
  const profile = await getProfile();
  if (profile) {
    const newBalance = transaction.type === 'income'
      ? profile.currentBalance + transaction.amount
      : profile.currentBalance - transaction.amount;
    await updateProfile({ currentBalance: newBalance });
  }
}

export async function getTransactionsBySubscription(subscriptionId: string): Promise<Transaction[]> {
  const db = await initDB();
  return db.getAllFromIndex('transactions', 'by-subscription', subscriptionId);
}

// Alert operations
export async function getAllAlerts(): Promise<Alert[]> {
  const db = await initDB();
  return db.getAll('alerts');
}

export async function getActiveAlerts(): Promise<Alert[]> {
  const db = await initDB();
  const allAlerts = await db.getAllFromIndex('alerts', 'by-dismissed', 0);
  return allAlerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export async function addAlert(alert: Alert): Promise<void> {
  const db = await initDB();
  await db.add('alerts', alert);
}

export async function dismissAlert(id: string): Promise<void> {
  const db = await initDB();
  const alert = await db.get('alerts', id);
  if (alert) {
    await db.put('alerts', { ...alert, dismissed: true });
  }
}

export async function clearOldAlerts(): Promise<void> {
  const db = await initDB();
  const allAlerts = await db.getAll('alerts');
  const now = new Date();

  for (const alert of allAlerts) {
    if (new Date(alert.dueDate) < now) {
      await db.delete('alerts', alert.id);
    }
  }
}

// Category operations
export async function getAllCategories(): Promise<Category[]> {
  const db = await initDB();
  return db.getAll('categories');
}

export async function getCategoriesByType(type: 'expense' | 'income'): Promise<Category[]> {
  const db = await initDB();
  return db.getAllFromIndex('categories', 'by-type', type);
}

export async function addCategory(category: Category): Promise<void> {
  const db = await initDB();
  await db.add('categories', category);
}

export async function updateCategory(category: Category): Promise<void> {
  const db = await initDB();
  await db.put('categories', category);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('categories', id);
}

// Budget operations
export async function getAllBudgets(): Promise<Budget[]> {
  const db = await initDB();
  return db.getAll('budgets');
}

export async function getBudgetByCategory(categoryId: string): Promise<Budget | undefined> {
  const db = await initDB();
  const budgets = await db.getAllFromIndex('budgets', 'by-category', categoryId);
  return budgets[0];
}

export async function addBudget(budget: Budget): Promise<void> {
  const db = await initDB();
  await db.add('budgets', budget);
}

export async function updateBudget(budget: Budget): Promise<void> {
  const db = await initDB();
  await db.put('budgets', { ...budget, updatedAt: new Date() });
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('budgets', id);
}

// Income Source operations
export async function getAllIncomeSources(): Promise<IncomeSource[]> {
  const db = await initDB();
  return db.getAll('incomeSources');
}

export async function getRecurringIncomeSources(): Promise<IncomeSource[]> {
  const db = await initDB();
  return db.getAllFromIndex('incomeSources', 'by-recurring', 1);
}

export async function addIncomeSource(source: IncomeSource): Promise<void> {
  const db = await initDB();
  await db.add('incomeSources', source);
}

export async function updateIncomeSource(source: IncomeSource): Promise<void> {
  const db = await initDB();
  await db.put('incomeSources', { ...source, updatedAt: new Date() });
}

export async function deleteIncomeSource(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('incomeSources', id);
}

// Enhanced transaction operations
export async function getTransactionsByType(type: 'income' | 'expense' | 'subscription'): Promise<Transaction[]> {
  const db = await initDB();
  const transactions = await db.getAllFromIndex('transactions', 'by-type', type);
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getTransactionsByCategory(category: string): Promise<Transaction[]> {
  const db = await initDB();
  const transactions = await db.getAllFromIndex('transactions', 'by-category', category);
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
  const db = await initDB();
  const allTransactions = await db.getAll('transactions');
  return allTransactions
    .filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  const db = await initDB();
  const oldTransaction = await db.get('transactions', transaction.id);

  // Update balance if amount or type changed
  if (oldTransaction) {
    const profile = await getProfile();
    if (profile) {
      // Reverse old transaction
      let newBalance = oldTransaction.type === 'income'
        ? profile.currentBalance - oldTransaction.amount
        : profile.currentBalance + oldTransaction.amount;

      // Apply new transaction
      newBalance = transaction.type === 'income'
        ? newBalance + transaction.amount
        : newBalance - transaction.amount;

      await updateProfile({ currentBalance: newBalance });
    }
  }

  await db.put('transactions', transaction);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await initDB();
  const transaction = await db.get('transactions', id);

  if (transaction) {
    // Reverse the transaction's effect on balance
    const profile = await getProfile();
    if (profile) {
      const newBalance = transaction.type === 'income'
        ? profile.currentBalance - transaction.amount
        : profile.currentBalance + transaction.amount;
      await updateProfile({ currentBalance: newBalance });
    }
  }

  await db.delete('transactions', id);
}

// Utility function to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
