import { useState } from 'react';
import { Transaction, Category } from '../types';
import { format } from 'date-fns';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';

interface TransactionFormProps {
  transaction?: Transaction;
  categories: Category[];
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function TransactionForm({
  transaction,
  categories,
  onSave,
  onCancel,
  onDelete,
}: TransactionFormProps) {
  const [type, setType] = useState<Transaction['type']>(transaction?.type || 'expense');
  const [amount, setAmount] = useState(transaction?.amount.toString() || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [category, setCategory] = useState(transaction?.category || '');
  const [date, setDate] = useState(
    transaction?.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCategories = categories.filter(c =>
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!category) {
      newErrors.category = 'Please select a category';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSave({
        type,
        amount: Number(amount),
        description: description.trim(),
        category,
        date: new Date(date),
        notes: notes.trim() || undefined,
      });
    }
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="w-4 h-4" /> : null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <Icons.X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory('');
                }}
                className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                  type === 'expense'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <Icons.TrendingDown className="w-5 h-5 inline mr-2" />
                Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory('');
                }}
                className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                  type === 'income'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <Icons.TrendingUp className="w-5 h-5 inline mr-2" />
                Income
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-2">
              Amount *
            </label>
            <div className="relative">
              <Icons.DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="amount"
                type="number"
                step="0.01"
                className="input-field pl-10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoComplete="off"
              />
            </div>
            {errors.amount && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description *
            </label>
            <input
              id="description"
              type="text"
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              autoComplete="off"
            />
            {errors.description && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2">
              Category *
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-all ${
                    category === cat.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                  style={{
                    borderColor: category === cat.id ? cat.color : undefined,
                  }}
                >
                  {getIcon(cat.icon)}
                  <span className="text-sm font-medium truncate">{cat.name}</span>
                </button>
              ))}
            </div>
            {errors.category && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-2">
              Date *
            </label>
            <input
              id="date"
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.date}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              {transaction ? 'Update' : 'Add'} Transaction
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>

          {transaction && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-full py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Icons.Trash2 className="w-4 h-4" />
              Delete Transaction
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
}
