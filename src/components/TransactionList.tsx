import { format } from 'date-fns';
import { Transaction, Category, CURRENCY_SYMBOLS } from '../types';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  onEdit: (id: string) => void;
}

export function TransactionList({
  transactions,
  categories,
  currency,
  onEdit,
}: TransactionListProps) {
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const getCategoryById = (id?: string) => {
    return categories.find(c => c.id === id);
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return <Icons.Receipt className="w-5 h-5" />;
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : <Icons.Receipt className="w-5 h-5" />;
  };

  const groupedByDate = transactions.reduce((acc, transaction) => {
    const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  if (transactions.length === 0) {
    return (
      <div className="card text-center py-12">
        <Icons.FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No transactions yet. Add your first transaction to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([dateKey, dayTransactions]) => {
          const totalDay = dayTransactions.reduce((sum, t) => {
            if (t.type === 'income') return sum + t.amount;
            return sum - t.amount;
          }, 0);

          return (
            <div key={dateKey}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {format(new Date(dateKey), 'EEE, MMM dd, yyyy')}
                </h3>
                <span
                  className={`text-sm font-semibold ${
                    totalDay >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {totalDay >= 0 ? '+' : ''}
                  {currencySymbol}
                  {Math.abs(totalDay).toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                {dayTransactions.map((transaction, index) => {
                  const category = getCategoryById(transaction.category);

                  return (
                    <motion.button
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onEdit(transaction.id)}
                      className="card w-full text-left hover:shadow-xl transition-all p-4"
                    >
                      <div className="flex items-center gap-4">
                        {/* Category Icon */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: category?.color ? `${category.color}20` : '#f3f4f6',
                            color: category?.color || '#6b7280',
                          }}
                        >
                          {getIcon(category?.icon)}
                        </div>

                        {/* Transaction Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {transaction.description}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {category?.name || 'Uncategorized'}
                            </span>
                            {transaction.type === 'subscription' && (
                              <span className="badge badge-warning text-xs">
                                <Icons.RefreshCw className="w-3 h-3 mr-1" />
                                Subscription
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <p
                            className={`font-bold text-lg ${
                              transaction.type === 'income'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {transaction.type === 'income' ? '+' : '-'}
                            {currencySymbol}
                            {transaction.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {transaction.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 pl-16">
                          {transaction.notes}
                        </p>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
