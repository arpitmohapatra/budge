import { useState } from 'react';
import { CURRENCIES } from '../types';

interface OnboardingProps {
  onComplete: (data: { name: string; currency: string; currentBalance: number }) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [balance, setBalance] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!balance || isNaN(Number(balance))) {
      newErrors.balance = 'Please enter a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onComplete({
        name: name.trim(),
        currency,
        currentBalance: Number(balance),
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            Welcome to Budge
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Let's set up your budget tracker
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              What's your name?
            </label>
            <input
              id="name"
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium mb-2">
              Preferred Currency
            </label>
            <select
              id="currency"
              className="input-field"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.value} value={curr.value}>
                  {curr.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="balance" className="block text-sm font-medium mb-2">
              Current Balance
            </label>
            <input
              id="balance"
              type="number"
              step="0.01"
              className="input-field"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              autoComplete="off"
            />
            {errors.balance && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.balance}</p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full">
            Get Started
          </button>
        </form>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6">
          All your data is stored locally on your device
        </p>
      </div>
    </div>
  );
}
