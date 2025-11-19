import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { UserProfile, Subscription, Transaction, Alert } from './types';

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
    indexes: { 'by-date': Date; 'by-subscription': string };
  };
  alerts: {
    key: string;
    value: Alert;
    indexes: { 'by-subscription': string; 'by-dismissed': number };
  };
}

const DB_NAME = 'budge-db';
const DB_VERSION = 1;

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

      // Create transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
        transactionStore.createIndex('by-date', 'date');
        transactionStore.createIndex('by-subscription', 'subscriptionId');
      }

      // Create alerts store
      if (!db.objectStoreNames.contains('alerts')) {
        const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertStore.createIndex('by-subscription', 'subscriptionId');
        alertStore.createIndex('by-dismissed', 'dismissed');
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

// Utility function to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
