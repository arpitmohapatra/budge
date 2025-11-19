import { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { EnhancedDashboard } from './components/EnhancedDashboard';
import { SubscriptionList } from './components/SubscriptionList';
import { SubscriptionForm } from './components/SubscriptionForm';
import { TransactionsView } from './components/TransactionsView';
import { AnalyticsView } from './components/AnalyticsView';
import { BudgetCard } from './components/BudgetCard';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { useProfile } from './hooks/useProfile';
import { useSubscriptions } from './hooks/useSubscriptions';
import { useAlerts } from './hooks/useAlerts';
import { useTransactions } from './hooks/useTransactions';
import { useCategories } from './hooks/useCategories';
import { useBudgets } from './hooks/useBudgets';
import { useAnalytics } from './hooks/useAnalytics';
import { Subscription, Transaction, TransactionFilters } from './types';
import { addTransaction, generateId } from './db';

type View = 'dashboard' | 'transactions' | 'subscriptions' | 'analytics';

function App() {
  const { profile, loading: profileLoading, createProfile } = useProfile();
  const {
    subscriptions,
    loading: subsLoading,
    createSubscription,
    editSubscription,
    removeSubscription,
    markAsPaid,
  } = useSubscriptions();
  const { alerts, dismissAlert } = useAlerts(subscriptions);
  const { categories, loading: categoriesLoading, initializeDefaultCategories } = useCategories();
  useBudgets();
  const { summary, categorySpending } = useAnalytics();

  const [filters, setFilters] = useState<TransactionFilters>({});
  const { transactions, createTransaction, editTransaction, removeTransaction } = useTransactions(filters);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  const loading = profileLoading || subsLoading || categoriesLoading;

  // Initialize default categories on first load
  useEffect(() => {
    if (profile && categories.length === 0 && !categoriesLoading) {
      initializeDefaultCategories();
    }
  }, [profile, categories.length, categoriesLoading]);

  // Show onboarding if no profile
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Onboarding
        onComplete={(data) => {
          createProfile(data);
        }}
      />
    );
  }

  const handleAddTransaction = () => {
    setCurrentView('transactions');
  };

  const handleAddSubscription = () => {
    setEditingSubId(null);
    setShowSubForm(true);
  };

  const handleEditSubscription = (id: string) => {
    setEditingSubId(id);
    setShowSubForm(true);
  };

  const handleSaveSubscription = async (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingSubId) {
      await editSubscription(editingSubId, data);
    } else {
      await createSubscription(data);
    }
    setShowSubForm(false);
    setEditingSubId(null);
  };

  const handleDeleteSubscription = async () => {
    if (editingSubId) {
      if (confirm('Are you sure you want to delete this subscription?')) {
        await removeSubscription(editingSubId);
        setShowSubForm(false);
        setEditingSubId(null);
      }
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    const subscription = subscriptions.find(s => s.id === id);
    if (subscription) {
      // Create transaction record
      await addTransaction({
        id: generateId(),
        type: 'subscription',
        amount: subscription.amount,
        description: `${subscription.name} - ${subscription.billingCycle} payment`,
        category: subscription.category,
        subscriptionId: id,
        date: new Date(),
        createdAt: new Date(),
      });

      // Update next payment date
      await markAsPaid(id);
    }
  };

  const handleSaveTransaction = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    createTransaction(data);
  };

  const handleEditTransaction = (id: string, data: Partial<Transaction>) => {
    editTransaction(id, data);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      removeTransaction(id);
    }
  };

  const editingSubscription = editingSubId
    ? subscriptions.find(s => s.id === editingSubId)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <Header title="Budge" />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {currentView === 'dashboard' && (
          <EnhancedDashboard
            profile={profile}
            subscriptions={subscriptions}
            alerts={alerts}
            monthlySummary={summary}
            onDismissAlert={dismissAlert}
            onAddTransaction={handleAddTransaction}
            onAddSubscription={handleAddSubscription}
            onEditSubscription={handleEditSubscription}
          />
        )}

        {currentView === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            categories={categories}
            currency={profile.currency}
            onSave={handleSaveTransaction}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            filters={filters}
            onFilterChange={setFilters}
          />
        )}

        {currentView === 'subscriptions' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">All Subscriptions</h2>
              <button onClick={handleAddSubscription} className="btn-primary text-sm py-2 px-4">
                + Add
              </button>
            </div>
            <SubscriptionList
              subscriptions={subscriptions}
              currency={profile.currency}
              onEdit={handleEditSubscription}
              onMarkAsPaid={handleMarkAsPaid}
            />
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsView summary={summary} currency={profile.currency} />

            {/* Budget Overview */}
            {categorySpending.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Budget Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categorySpending.map((spending) => {
                    const category = categories.find(c => c.id === spending.categoryId);
                    if (!category) return null;

                    return (
                      <BudgetCard
                        key={spending.categoryId}
                        category={category}
                        budgetAmount={spending.budgetLimit}
                        spentAmount={spending.amount}
                        currency={profile.currency}
                        transactionCount={spending.transactionCount}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav currentView={currentView} onViewChange={setCurrentView} />

      {showSubForm && (
        <SubscriptionForm
          subscription={editingSubscription}
          onSave={handleSaveSubscription}
          onCancel={() => {
            setShowSubForm(false);
            setEditingSubId(null);
          }}
          onDelete={editingSubId ? handleDeleteSubscription : undefined}
        />
      )}
    </div>
  );
}

export default App;
