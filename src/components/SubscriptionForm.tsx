import { useState } from 'react';
import { Subscription, BILLING_CYCLES } from '../types';
import { format } from 'date-fns';

interface SubscriptionFormProps {
  subscription?: Subscription;
  onSave: (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function SubscriptionForm({
  subscription,
  onSave,
  onCancel,
  onDelete,
}: SubscriptionFormProps) {
  const [name, setName] = useState(subscription?.name || '');
  const [amount, setAmount] = useState(subscription?.amount.toString() || '');
  const [billingCycle, setBillingCycle] = useState<Subscription['billingCycle']>(
    subscription?.billingCycle || 'monthly'
  );
  const [nextPaymentDate, setNextPaymentDate] = useState(
    subscription?.nextPaymentDate
      ? format(new Date(subscription.nextPaymentDate), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [category, setCategory] = useState(subscription?.category || '');
  const [description, setDescription] = useState(subscription?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!nextPaymentDate) {
      newErrors.nextPaymentDate = 'Next payment date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSave({
        name: name.trim(),
        amount: Number(amount),
        billingCycle,
        nextPaymentDate: new Date(nextPaymentDate),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {subscription ? 'Edit Subscription' : 'Add Subscription'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Subscription Name *
            </label>
            <input
              id="name"
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Netflix, Spotify, etc."
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-2">
              Amount *
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoComplete="off"
            />
            {errors.amount && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <label htmlFor="billingCycle" className="block text-sm font-medium mb-2">
              Billing Cycle *
            </label>
            <select
              id="billingCycle"
              className="input-field"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as Subscription['billingCycle'])}
            >
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle.value} value={cycle.value}>
                  {cycle.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="nextPaymentDate" className="block text-sm font-medium mb-2">
              Next Payment Date *
            </label>
            <input
              id="nextPaymentDate"
              type="date"
              className="input-field"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
            />
            {errors.nextPaymentDate && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                {errors.nextPaymentDate}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2">
              Category (Optional)
            </label>
            <input
              id="category"
              type="text"
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Entertainment, Productivity, etc."
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              {subscription ? 'Update' : 'Add'} Subscription
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>

          {subscription && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-full py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Delete Subscription
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
