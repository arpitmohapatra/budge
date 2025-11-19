import { format, differenceInDays } from 'date-fns';
import { UserProfile, Subscription, Alert, CURRENCY_SYMBOLS } from '../types';

interface DashboardProps {
  profile: UserProfile;
  subscriptions: Subscription[];
  alerts: Alert[];
  onDismissAlert: (id: string) => void;
  onAddSubscription: () => void;
  onEditSubscription: (id: string) => void;
}

export function Dashboard({
  profile,
  subscriptions,
  alerts,
  onDismissAlert,
  onAddSubscription,
  onEditSubscription,
}: DashboardProps) {
  const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || profile.currency;

  // Calculate upcoming payments
  const upcomingPayments = subscriptions
    .filter(sub => {
      const days = differenceInDays(new Date(sub.nextPaymentDate), new Date());
      return days >= 0 && days <= 30;
    })
    .sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime())
    .slice(0, 5);

  const totalMonthlySpend = subscriptions
    .filter(sub => sub.billingCycle === 'monthly')
    .reduce((sum, sub) => sum + sub.amount, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <h2 className="text-2xl font-bold mb-2">Hello, {profile.name}!</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">
            {currencySymbol}
            {profile.currentBalance.toFixed(2)}
          </span>
          <span className="text-primary-100">Current Balance</span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Upcoming Payments</h3>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`card flex items-center justify-between ${
                alert.daysUntilDue === 0
                  ? 'border-l-4 border-red-500'
                  : alert.daysUntilDue === 1
                  ? 'border-l-4 border-yellow-500'
                  : 'border-l-4 border-blue-500'
              }`}
            >
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {alert.subscriptionName}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Subscriptions</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {subscriptions.length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Monthly Subscriptions</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {currencySymbol}
            {totalMonthlySpend.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Upcoming Payments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Next 30 Days</h3>
          <button onClick={onAddSubscription} className="btn-primary text-sm py-2 px-4">
            + Add Subscription
          </button>
        </div>

        {upcomingPayments.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No subscriptions yet. Add your first subscription to get started!
            </p>
            <button onClick={onAddSubscription} className="btn-primary">
              Add Subscription
            </button>
          </div>
        ) : (
          <div className="space-y-3">
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
                        {format(new Date(sub.nextPaymentDate), 'MMM dd, yyyy')} •{' '}
                        {daysUntil === 0
                          ? 'Today'
                          : daysUntil === 1
                          ? 'Tomorrow'
                          : `${daysUntil} days`}
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
      </div>
    </div>
  );
}
