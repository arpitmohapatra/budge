import { format } from 'date-fns';
import { Subscription, CURRENCY_SYMBOLS } from '../types';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  currency: string;
  onEdit: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
}

export function SubscriptionList({
  subscriptions,
  currency,
  onEdit,
  onMarkAsPaid,
}: SubscriptionListProps) {
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  // Group subscriptions by category
  const grouped = subscriptions.reduce((acc, sub) => {
    const cat = sub.category || 'Uncategorized';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(sub);
    return acc;
  }, {} as Record<string, Subscription[]>);

  if (subscriptions.length === 0) {
    return (
      <div className="card text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400">
          No subscriptions yet. Add one to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, subs]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
              {category}
            </h3>
            <div className="space-y-3">
              {subs
                .sort(
                  (a, b) =>
                    new Date(a.nextPaymentDate).getTime() -
                    new Date(b.nextPaymentDate).getTime()
                )
                .map((sub) => (
                  <div key={sub.id} className="card hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {sub.name}
                        </h4>
                        {sub.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {sub.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-gray-900 dark:text-gray-100">
                          {currencySymbol}
                          {sub.amount.toFixed(2)}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {sub.billingCycle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Next: {format(new Date(sub.nextPaymentDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onMarkAsPaid(sub.id)}
                          className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={() => onEdit(sub.id)}
                          className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
