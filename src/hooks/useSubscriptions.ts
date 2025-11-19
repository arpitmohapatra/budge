import { useState, useEffect } from 'react';
import { Subscription } from '../types';
import {
  getAllSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  generateId,
} from '../db';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const data = await getAllSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSubscription: Subscription = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await addSubscription(newSubscription);
    await loadSubscriptions();
  };

  const editSubscription = async (id: string, data: Partial<Subscription>) => {
    const existing = subscriptions.find(s => s.id === id);
    if (existing) {
      await updateSubscription({ ...existing, ...data });
      await loadSubscriptions();
    }
  };

  const removeSubscription = async (id: string) => {
    await deleteSubscription(id);
    await loadSubscriptions();
  };

  const calculateNextPaymentDate = (currentDate: Date, cycle: Subscription['billingCycle']): Date => {
    switch (cycle) {
      case 'daily':
        return addDays(currentDate, 1);
      case 'weekly':
        return addWeeks(currentDate, 1);
      case 'monthly':
        return addMonths(currentDate, 1);
      case 'yearly':
        return addYears(currentDate, 1);
      default:
        return addMonths(currentDate, 1);
    }
  };

  const markAsPaid = async (id: string) => {
    const subscription = subscriptions.find(s => s.id === id);
    if (subscription) {
      const nextDate = calculateNextPaymentDate(new Date(subscription.nextPaymentDate), subscription.billingCycle);
      await editSubscription(id, { nextPaymentDate: nextDate });
    }
  };

  return {
    subscriptions,
    loading,
    createSubscription,
    editSubscription,
    removeSubscription,
    markAsPaid,
    refreshSubscriptions: loadSubscriptions,
  };
}
