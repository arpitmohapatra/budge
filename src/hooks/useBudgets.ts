import { useState, useEffect } from 'react';
import { Budget } from '../types';
import {
  getAllBudgets,
  getBudgetByCategory,
  addBudget,
  updateBudget,
  deleteBudget,
  generateId,
} from '../db';

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const data = await getAllBudgets();
      setBudgets(data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async (
    data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newBudget: Budget = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await addBudget(newBudget);
    await loadBudgets();
  };

  const editBudget = async (id: string, data: Partial<Budget>) => {
    const existing = budgets.find(b => b.id === id);
    if (existing) {
      await updateBudget({ ...existing, ...data });
      await loadBudgets();
    }
  };

  const removeBudget = async (id: string) => {
    await deleteBudget(id);
    await loadBudgets();
  };

  const getBudgetForCategory = async (categoryId: string) => {
    return await getBudgetByCategory(categoryId);
  };

  return {
    budgets,
    loading,
    createBudget,
    editBudget,
    removeBudget,
    getBudgetForCategory,
    refreshBudgets: loadBudgets,
  };
}
