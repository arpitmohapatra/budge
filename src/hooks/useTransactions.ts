import { useState, useEffect } from 'react';
import { Transaction, TransactionFilters } from '../types';
import {
  getAllTransactions,
  getTransactionsByType,
  getTransactionsByCategory,
  getTransactionsByDateRange,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  generateId,
} from '../db';

export function useTransactions(filters?: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    try {
      let data: Transaction[] = [];

      if (filters?.type) {
        data = await getTransactionsByType(filters.type);
      } else if (filters?.category) {
        data = await getTransactionsByCategory(filters.category);
      } else if (filters?.startDate && filters?.endDate) {
        data = await getTransactionsByDateRange(filters.startDate, filters.endDate);
      } else {
        data = await getAllTransactions();
      }

      // Apply additional filters
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        data = data.filter(t =>
          t.description.toLowerCase().includes(term) ||
          t.category?.toLowerCase().includes(term)
        );
      }

      if (filters?.minAmount !== undefined) {
        data = data.filter(t => t.amount >= filters.minAmount!);
      }

      if (filters?.maxAmount !== undefined) {
        data = data.filter(t => t.amount <= filters.maxAmount!);
      }

      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt'>
  ) => {
    const newTransaction: Transaction = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
    };
    await addTransaction(newTransaction);
    await loadTransactions();
  };

  const editTransaction = async (id: string, data: Partial<Transaction>) => {
    const existing = transactions.find(t => t.id === id);
    if (existing) {
      await updateTransaction({ ...existing, ...data });
      await loadTransactions();
    }
  };

  const removeTransaction = async (id: string) => {
    await deleteTransaction(id);
    await loadTransactions();
  };

  return {
    transactions,
    loading,
    createTransaction,
    editTransaction,
    removeTransaction,
    refreshTransactions: loadTransactions,
  };
}
