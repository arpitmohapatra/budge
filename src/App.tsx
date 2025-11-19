import { useState } from 'react';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { SubscriptionList } from './components/SubscriptionList';
import { SubscriptionForm } from './components/SubscriptionForm';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { useProfile } from './hooks/useProfile';
import { useSubscriptions } from './hooks/useSubscriptions';
import { useAlerts } from './hooks/useAlerts';
import { Subscription } from './types';
import { addTransaction, generateId } from './db';

type View = 'dashboard' | 'subscriptions';

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

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  const loading = profileLoading || subsLoading;

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
        subscriptionId: id,
        date: new Date(),
        createdAt: new Date(),
      });

      // Update next payment date
      await markAsPaid(id);
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
          <Dashboard
            profile={profile}
            subscriptions={subscriptions}
            alerts={alerts}
            onDismissAlert={dismissAlert}
            onAddSubscription={handleAddSubscription}
            onEditSubscription={handleEditSubscription}
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
