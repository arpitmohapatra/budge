import { useState, useEffect } from 'react';
import { Category, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../types';
import {
  getAllCategories,
  getCategoriesByType,
  addCategory,
  updateCategory,
  deleteCategory,
  generateId,
} from '../db';

export function useCategories(type?: 'expense' | 'income') {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, [type]);

  const loadCategories = async () => {
    try {
      const data = type
        ? await getCategoriesByType(type)
        : await getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultCategories = async () => {
    const existing = await getAllCategories();
    if (existing.length === 0) {
      // Add default expense categories
      for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
        await addCategory({
          id: generateId(),
          name: cat.name,
          type: 'expense',
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          createdAt: new Date(),
        });
      }

      // Add default income categories
      for (const cat of DEFAULT_INCOME_CATEGORIES) {
        await addCategory({
          id: generateId(),
          name: cat.name,
          type: 'income',
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          createdAt: new Date(),
        });
      }

      await loadCategories();
    }
  };

  const createCategory = async (
    data: Omit<Category, 'id' | 'createdAt'>
  ) => {
    const newCategory: Category = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
    };
    await addCategory(newCategory);
    await loadCategories();
  };

  const editCategory = async (id: string, data: Partial<Category>) => {
    const existing = categories.find(c => c.id === id);
    if (existing) {
      await updateCategory({ ...existing, ...data });
      await loadCategories();
    }
  };

  const removeCategory = async (id: string) => {
    await deleteCategory(id);
    await loadCategories();
  };

  return {
    categories,
    loading,
    createCategory,
    editCategory,
    removeCategory,
    initializeDefaultCategories,
    refreshCategories: loadCategories,
  };
}
