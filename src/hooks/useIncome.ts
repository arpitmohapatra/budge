import { useState, useEffect } from 'react';
import { IncomeSource } from '../types';
import {
  getAllIncomeSources,
  getRecurringIncomeSources,
  addIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  addTransaction,
  generateId,
} from '../db';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export function useIncome() {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncomeSources();
  }, []);

  const loadIncomeSources = async () => {
    try {
      const data = await getAllIncomeSources();
      setIncomeSources(data);
    } catch (error) {
      console.error('Failed to load income sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const createIncomeSource = async (
    data: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newSource: IncomeSource = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await addIncomeSource(newSource);
    await loadIncomeSources();
  };

  const editIncomeSource = async (id: string, data: Partial<IncomeSource>) => {
    const existing = incomeSources.find(s => s.id === id);
    if (existing) {
      await updateIncomeSource({ ...existing, ...data });
      await loadIncomeSources();
    }
  };

  const removeIncomeSource = async (id: string) => {
    await deleteIncomeSource(id);
    await loadIncomeSources();
  };

  const calculateNextDate = (currentDate: Date, frequency: IncomeSource['frequency']): Date => {
    switch (frequency) {
      case 'daily':
        return addDays(currentDate, 1);
      case 'weekly':
        return addWeeks(currentDate, 1);
      case 'biweekly':
        return addWeeks(currentDate, 2);
      case 'monthly':
        return addMonths(currentDate, 1);
      case 'yearly':
        return addYears(currentDate, 1);
      default:
        return addMonths(currentDate, 1);
    }
  };

  const processRecurringIncome = async () => {
    const recurring = await getRecurringIncomeSources();
    const now = new Date();

    for (const source of recurring) {
      if (source.nextDate && new Date(source.nextDate) <= now) {
        // Create income transaction
        await addTransaction({
          id: generateId(),
          type: 'income',
          amount: source.amount,
          description: `${source.name} - Recurring Income`,
          category: source.categoryId,
          incomeSourceId: source.id,
          date: new Date(),
          createdAt: new Date(),
        });

        // Update next date
        if (source.frequency) {
          const nextDate = calculateNextDate(new Date(source.nextDate), source.frequency);
          await updateIncomeSource({ ...source, nextDate });
        }
      }
    }

    await loadIncomeSources();
  };

  return {
    incomeSources,
    loading,
    createIncomeSource,
    editIncomeSource,
    removeIncomeSource,
    processRecurringIncome,
    refreshIncomeSources: loadIncomeSources,
  };
}
