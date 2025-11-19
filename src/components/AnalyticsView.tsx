import { MonthlySummary, CURRENCY_SYMBOLS } from '../types';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AnalyticsViewProps {
  summary: MonthlySummary | null;
  currency: string;
}

export function AnalyticsView({ summary, currency }: AnalyticsViewProps) {
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  if (!summary) {
    return (
      <div className="card text-center py-12">
        <Icons.BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No data available for this month.
        </p>
      </div>
    );
  }

  const savingsRate = summary.totalIncome > 0
    ? (summary.netSavings / summary.totalIncome) * 100
    : 0;

  // Prepare data for pie chart
  const chartData = summary.categoryBreakdown.slice(0, 8).map(cat => ({
    name: cat.categoryName,
    value: cat.amount,
    percentage: cat.percentage,
  }));

  // Colors for the pie chart
  const COLORS = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-br from-green-500 to-green-600 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icons.TrendingUp className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">Total Income</span>
          </div>
          <p className="text-3xl font-bold">
            {currencySymbol}
            {summary.totalIncome.toFixed(2)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-gradient-to-br from-red-500 to-red-600 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icons.TrendingDown className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">Total Expenses</span>
          </div>
          <p className="text-3xl font-bold">
            {currencySymbol}
            {summary.totalExpenses.toFixed(2)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`card bg-gradient-to-br ${
            summary.netSavings >= 0
              ? 'from-blue-500 to-blue-600'
              : 'from-orange-500 to-orange-600'
          } text-white`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icons.Wallet className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">Net Savings</span>
          </div>
          <p className="text-3xl font-bold">
            {summary.netSavings >= 0 ? '+' : ''}
            {currencySymbol}
            {summary.netSavings.toFixed(2)}
          </p>
          <p className="text-sm opacity-90 mt-1">
            {savingsRate.toFixed(1)}% savings rate
          </p>
        </motion.div>
      </div>

      {/* Category Breakdown */}
      {summary.categoryBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Icons.PieChart className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Spending by Category
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name} (${props.payload.percentage.toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category List */}
            <div className="space-y-3">
              {summary.categoryBreakdown.map((cat, index) => {
                const isOverBudget = cat.budgetLimit && cat.amount > cat.budgetLimit;

                return (
                  <div
                    key={cat.categoryId}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {cat.categoryName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {cat.transactionCount} transaction{cat.transactionCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {currencySymbol}
                        {cat.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cat.percentage.toFixed(1)}%
                      </p>
                      {isOverBudget && (
                        <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                          <Icons.AlertTriangle className="w-3 h-3" />
                          Over budget
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Icons.Lightbulb className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          Insights
        </h2>

        <div className="space-y-3">
          {savingsRate >= 20 && (
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Icons.ThumbsUp className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Great job!</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You're saving {savingsRate.toFixed(1)}% of your income. Keep up the good work!
                </p>
              </div>
            </div>
          )}

          {savingsRate < 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Icons.AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">Spending Alert</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  You're spending more than you earn this month. Consider reviewing your expenses.
                </p>
              </div>
            </div>
          )}

          {summary.categoryBreakdown.some(c => c.budgetLimit && c.amount > c.budgetLimit) && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Icons.AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">Budget Exceeded</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You've exceeded your budget in{' '}
                  {summary.categoryBreakdown.filter(c => c.budgetLimit && c.amount > c.budgetLimit).length}{' '}
                  {summary.categoryBreakdown.filter(c => c.budgetLimit && c.amount > c.budgetLimit).length === 1 ? 'category' : 'categories'}.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
