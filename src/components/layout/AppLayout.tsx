import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Activity, Utensils, Dumbbell, BarChart3, Settings, MessageCircle } from 'lucide-react';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenSettings: () => void;
}

export function AppLayout({ children, onOpenSettings }: AppLayoutProps) {
  const { activeTab, setActiveTab, settings } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const tabs = [
    { id: 'body', label: 'Body', icon: Activity },
    { id: 'food', label: 'Food', icon: Utensils },
    { id: 'workout', label: 'Workout', icon: Dumbbell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai', label: 'AI', icon: MessageCircle },
  ];

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-title">Olistic</h1>
        <button className="btn btn-icon btn-secondary" onClick={onOpenSettings} title="Settings">
          <Settings size={18} />
        </button>
      </header>
      <main className="app-main">{children}</main>
      <nav className="app-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
