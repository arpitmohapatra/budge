import { useState, useEffect } from 'react';
import { MonthlySummary, CategorySpending } from '../types';
import {
  getTransactionsByDateRange,
  getAllBudgets,
  getAllCategories,
} from '../db';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export function useAnalytics(month?: Date) {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateAnalytics();
  }, [month]);

  const calculateAnalytics = async () => {
    try {
      const targetMonth = month || new Date();
      const startDate = startOfMonth(targetMonth);
      const endDate = endOfMonth(targetMonth);

      const transactions = await getTransactionsByDateRange(startDate, endDate);
      const budgets = await getAllBudgets();
      const categories = await getAllCategories();

      // Calculate totals
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = transactions
        .filter(t => t.type === 'expense' || t.type === 'subscription')
        .reduce((sum, t) => sum + t.amount, 0);

      const netSavings = totalIncome - totalExpenses;

      // Calculate category breakdown
      const categoryMap = new Map<string, { amount: number; count: number }>();

      transactions
        .filter(t => t.type === 'expense' || t.type === 'subscription')
        .forEach(t => {
          if (t.category) {
            const existing = categoryMap.get(t.category) || { amount: 0, count: 0 };
            categoryMap.set(t.category, {
              amount: existing.amount + t.amount,
              count: existing.count + 1,
            });
          }
        });

      const categoryBreakdown: CategorySpending[] = Array.from(categoryMap.entries()).map(
        ([categoryId, data]) => {
          const category = categories.find(c => c.id === categoryId);
          const budget = budgets.find(b => b.categoryId === categoryId && b.period === 'monthly');

          return {
            categoryId,
            categoryName: category?.name || 'Unknown',
            amount: data.amount,
            percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
            budgetLimit: budget?.amount,
            transactionCount: data.count,
          };
        }
      );

      // Sort by amount descending
      categoryBreakdown.sort((a, b) => b.amount - a.amount);

      setSummary({
        month: format(targetMonth, 'yyyy-MM'),
        totalIncome,
        totalExpenses,
        netSavings,
        categoryBreakdown,
      });

      setCategorySpending(categoryBreakdown);
    } catch (error) {
      console.error('Failed to calculate analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalSpendingByCategory = (categoryId: string): number => {
    const spending = categorySpending.find(s => s.categoryId === categoryId);
    return spending?.amount || 0;
  };

  const getBudgetStatus = (categoryId: string): {
    spent: number;
    limit?: number;
    remaining?: number;
    percentage?: number;
    exceeded: boolean;
  } => {
    const spending = categorySpending.find(s => s.categoryId === categoryId);
    const spent = spending?.amount || 0;
    const limit = spending?.budgetLimit;

    if (!limit) {
      return { spent, exceeded: false };
    }

    const remaining = limit - spent;
    const percentage = (spent / limit) * 100;

    return {
      spent,
      limit,
      remaining,
      percentage,
      exceeded: spent > limit,
    };
  };

  return {
    summary,
    categorySpending,
    loading,
    getTotalSpendingByCategory,
    getBudgetStatus,
    refreshAnalytics: calculateAnalytics,
  };
}
