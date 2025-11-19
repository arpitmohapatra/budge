import { useState, useEffect } from 'react';
import { Alert, Subscription } from '../types';
import {
  getActiveAlerts,
  addAlert,
  dismissAlert,
  clearOldAlerts,
  generateId,
} from '../db';
import { differenceInDays } from 'date-fns';

export function useAlerts(subscriptions: Subscription[]) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    checkForNewAlerts();
  }, [subscriptions]);

  const loadAlerts = async () => {
    try {
      await clearOldAlerts();
      const data = await getActiveAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewAlerts = async () => {
    const now = new Date();
    const existingAlertSubs = new Set(alerts.map(a => a.subscriptionId));

    for (const sub of subscriptions) {
      const nextPayment = new Date(sub.nextPaymentDate);
      const daysUntil = differenceInDays(nextPayment, now);

      // Create alert if payment is within 3 days and we don't have an alert for it
      if (daysUntil >= 0 && daysUntil <= 3 && !existingAlertSubs.has(sub.id)) {
        const newAlert: Alert = {
          id: generateId(),
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          amount: sub.amount,
          dueDate: sub.nextPaymentDate,
          daysUntilDue: daysUntil,
          dismissed: false,
          createdAt: new Date(),
        };
        await addAlert(newAlert);
      }
    }

    await loadAlerts();
  };

  const dismiss = async (id: string) => {
    await dismissAlert(id);
    await loadAlerts();
  };

  return {
    alerts,
    loading,
    dismissAlert: dismiss,
    refreshAlerts: loadAlerts,
  };
}
