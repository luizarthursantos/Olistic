import { useState } from 'react';
import { useStore } from './store/useStore';
import { AppLayout } from './components/layout/AppLayout';
import { Onboarding } from './components/settings/Onboarding';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { BodyTab } from './components/body/BodyTab';
import { FoodTab } from './components/food/FoodTab';
import { WorkoutTab } from './components/workout/WorkoutTab';
import { AnalyticsTab } from './components/analytics/AnalyticsTab';

function App() {
  const { settings, activeTab } = useStore();
  const [showSettings, setShowSettings] = useState(false);

  if (!settings.onboardingComplete) {
    return <Onboarding />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'body':
        return <BodyTab />;
      case 'food':
        return <FoodTab />;
      case 'workout':
        return <WorkoutTab />;
      case 'analytics':
        return <AnalyticsTab />;
      default:
        return <BodyTab />;
    }
  };

  return (
    <>
      <AppLayout onOpenSettings={() => setShowSettings(true)}>
        {renderTab()}
      </AppLayout>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default App;
