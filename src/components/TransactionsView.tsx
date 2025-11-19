import { useState } from 'react';
import { TransactionList } from './TransactionList';
import { TransactionForm } from './TransactionForm';
import { Transaction, Category, TransactionFilters } from '../types';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onEdit: (id: string, data: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  filters?: TransactionFilters;
  onFilterChange?: (filters: TransactionFilters) => void;
}

export function TransactionsView({
  transactions,
  categories,
  currency,
  onSave,
  onEdit,
  onDelete,
  filters,
  onFilterChange,
}: TransactionsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters || {});

  const editingTransaction = editingId
    ? transactions.find(t => t.id === editingId)
    : undefined;

  const handleSave = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingId) {
      onEdit(editingId, data);
    } else {
      onSave(data);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = () => {
    if (editingId) {
      if (confirm('Are you sure you want to delete this transaction?')) {
        onDelete(editingId);
        setShowForm(false);
        setEditingId(null);
      }
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const applyFilters = () => {
    onFilterChange?.(localFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setLocalFilters({});
    onFilterChange?.({});
    setShowFilters(false);
  };

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' || t.type === 'subscription')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-br from-green-500 to-green-600 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icons.TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Income</span>
          </div>
          <p className="text-2xl font-bold">${totalIncome.toFixed(2)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-gradient-to-br from-red-500 to-red-600 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icons.TrendingDown className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Expenses</span>
          </div>
          <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
        </motion.div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Icons.Plus className="w-5 h-5" />
          Add Transaction
        </button>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary flex items-center gap-2"
        >
          <Icons.Filter className="w-5 h-5" />
          Filters
          {Object.keys(localFilters).length > 0 && (
            <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {Object.keys(localFilters).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card"
        >
          <h3 className="font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                className="input-field"
                value={localFilters.type || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    type: e.target.value as any || undefined,
                  })
                }
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                className="input-field"
                value={localFilters.category || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    category: e.target.value || undefined,
                  })
                }
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                className="input-field"
                placeholder="Search transactions..."
                value={localFilters.searchTerm || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    searchTerm: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={applyFilters} className="btn-primary">
              Apply Filters
            </button>
            <button onClick={clearFilters} className="btn-secondary">
              Clear All
            </button>
          </div>
        </motion.div>
      )}

      {/* Transaction List */}
      <TransactionList
        transactions={transactions}
        categories={categories}
        currency={currency}
        onEdit={handleEdit}
      />

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          categories={categories}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          onDelete={editingId ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
