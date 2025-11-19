import { format, differenceInDays } from 'date-fns';
import { UserProfile, Subscription, Alert, MonthlySummary, CURRENCY_SYMBOLS } from '../types';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';

interface EnhancedDashboardProps {
  profile: UserProfile;
  subscriptions: Subscription[];
  alerts: Alert[];
  monthlySummary: MonthlySummary | null;
  onDismissAlert: (id: string) => void;
  onAddTransaction: () => void;
  onAddSubscription: () => void;
  onEditSubscription: (id: string) => void;
}

export function EnhancedDashboard({
  profile,
  subscriptions,
  alerts,
  monthlySummary,
  onDismissAlert,
  onAddTransaction,
  onAddSubscription,
  onEditSubscription,
}: EnhancedDashboardProps) {
  const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || profile.currency;

  const upcomingPayments = subscriptions
    .filter(sub => {
      const days = differenceInDays(new Date(sub.nextPaymentDate), new Date());
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime())
    .slice(0, 3);

  const totalMonthlySpend = subscriptions
    .filter(sub => sub.billingCycle === 'monthly')
    .reduce((sum, sub) => sum + sub.amount, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 text-white overflow-hidden relative"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Hello, {profile.name}!</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold">
              {currencySymbol}
              {profile.currentBalance.toFixed(2)}
            </span>
          </div>
          <span className="text-primary-100 text-sm">Current Balance</span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <button
          onClick={onAddTransaction}
          className="card hover:shadow-xl transition-all p-4 flex items-center gap-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-700"
        >
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Icons.Plus className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Add Transaction</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Log income or expense</p>
          </div>
        </button>

        <button
          onClick={onAddSubscription}
          className="card hover:shadow-xl transition-all p-4 flex items-center gap-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700"
        >
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Icons.RefreshCw className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Add Subscription</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Track recurring payment</p>
          </div>
        </button>
      </motion.div>

      {/* Monthly Summary */}
      {monthlySummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="card text-center">
            <Icons.TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Income</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {currencySymbol}
              {monthlySummary.totalIncome.toFixed(0)}
            </p>
          </div>

          <div className="card text-center">
            <Icons.TrendingDown className="w-8 h-8 mx-auto mb-2 text-red-600 dark:text-red-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Expenses</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {currencySymbol}
              {monthlySummary.totalExpenses.toFixed(0)}
            </p>
          </div>

          <div className="card text-center">
            <Icons.PiggyBank className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Saved</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {monthlySummary.netSavings >= 0 ? '+' : ''}
              {currencySymbol}
              {monthlySummary.netSavings.toFixed(0)}
            </p>
          </div>
        </motion.div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Icons.Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Payment Reminders
          </h3>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`card flex items-center justify-between ${
                  alert.daysUntilDue === 0
                    ? 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10'
                    : alert.daysUntilDue === 1
                    ? 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                    : 'border-l-4 border-blue-500'
                }`}
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {alert.subscriptionName}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Icons.Clock className="w-3 h-3" />
                    {alert.daysUntilDue === 0
                      ? 'Due today'
                      : alert.daysUntilDue === 1
                      ? 'Due tomorrow'
                      : `Due in ${alert.daysUntilDue} days`}
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    {currencySymbol}
                    {alert.amount.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => onDismissAlert(alert.id)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Dismiss alert"
                >
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Upcoming Subscriptions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icons.Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Next 7 Days
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {totalMonthlySpend > 0 && (
              <>
                {currencySymbol}
                {totalMonthlySpend.toFixed(2)}/mo
              </>
            )}
          </span>
        </div>

        {upcomingPayments.length === 0 ? (
          <div className="card text-center py-8">
            <Icons.CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No payments due in the next 7 days!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingPayments.map((sub) => {
              const daysUntil = differenceInDays(new Date(sub.nextPaymentDate), new Date());
              return (
                <button
                  key={sub.id}
                  onClick={() => onEditSubscription(sub.id)}
                  className="card w-full text-left hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {sub.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(sub.nextPaymentDate), 'MMM dd')} •{' '}
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {currencySymbol}
                        {sub.amount.toFixed(2)}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {sub.billingCycle}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
