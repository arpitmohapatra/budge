import { Category, CURRENCY_SYMBOLS } from '../types';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';

interface BudgetCardProps {
  category: Category;
  budgetAmount?: number;
  spentAmount: number;
  currency: string;
  transactionCount: number;
  onEdit?: () => void;
}

export function BudgetCard({
  category,
  budgetAmount,
  spentAmount,
  currency,
  transactionCount,
  onEdit,
}: BudgetCardProps) {
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  const percentage = budgetAmount ? (spentAmount / budgetAmount) * 100 : 0;
  const remaining = budgetAmount ? budgetAmount - spentAmount : 0;
  const isOverBudget = budgetAmount ? spentAmount > budgetAmount : false;

  const getIcon = (iconName?: string) => {
    if (!iconName) return <Icons.Tag className="w-6 h-6" />;
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="w-6 h-6" /> : <Icons.Tag className="w-6 h-6" />;
  };

  const getProgressColor = () => {
    if (!budgetAmount) return 'bg-gray-400';
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="card cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: category.color ? `${category.color}20` : '#f3f4f6',
              color: category.color || '#6b7280',
            }}
          >
            {getIcon(category.icon)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{category.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {isOverBudget && (
          <span className="badge badge-danger">
            <Icons.AlertTriangle className="w-3 h-3 mr-1" />
            Over Budget
          </span>
        )}
      </div>

      {/* Spending Display */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currencySymbol}
            {spentAmount.toFixed(2)}
          </span>
          {budgetAmount && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              of {currencySymbol}
              {budgetAmount.toFixed(2)}
            </span>
          )}
        </div>

        {budgetAmount && (
          <>
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`${getProgressColor()} h-2.5 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {percentage.toFixed(0)}% used
              </span>
              <span
                className={`font-semibold ${
                  remaining >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {remaining >= 0 ? (
                  <>
                    {currencySymbol}
                    {remaining.toFixed(2)} left
                  </>
                ) : (
                  <>
                    {currencySymbol}
                    {Math.abs(remaining).toFixed(2)} over
                  </>
                )}
              </span>
            </div>
          </>
        )}

        {!budgetAmount && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No budget set. Click to set a budget limit.
          </p>
        )}
      </div>
    </motion.div>
  );
}
