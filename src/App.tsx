import { useEffect, useMemo } from 'react';
import { CalendarClock, Ellipsis, Gauge, Landmark, LayoutGrid, LineChart, ListChecks, Plus, Search, Settings as Cog, TrendingUp } from 'lucide-react';
import { ModalHost } from './forms';
import { budgetRows } from './lib/ledger';
import { monthOf } from './lib/dates';
import { AppProvider, useApp } from './lib/store';
import Accounts from './pages/Accounts';
import Activity from './pages/Activity';
import Bills from './pages/Bills';
import Budgets from './pages/Budgets';
import Forecast from './pages/Forecast';
import Home from './pages/Home';
import Invest from './pages/Invest';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import { Palette } from './ui/Palette';
import { Confetti, ErrorBoundary, ToastHost, WhoSwitch } from './ui/kit';
import { navigate, usePath } from './ui/router';

const NAV = [
  { to: '/', label: 'Home', icon: LayoutGrid },
  { to: '/activity', label: 'Activity', icon: ListChecks },
  { to: '/budgets', label: 'Budgets', icon: Gauge },
  { to: '/forecast', label: 'Forecast', icon: LineChart },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/bills', label: 'Bills & income', icon: CalendarClock },
  { to: '/invest', label: 'Investments', icon: TrendingUp },
] as const;

function Shell() {
  const { state, scope, today, openModal, closeModal, setPalette } = useApp();
  const path = usePath();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); return; }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.querySelector('dialog[open]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); openModal('tx'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openModal, setPalette]);

  useEffect(() => { window.scrollTo({ top: 0 }); document.getElementById('view')?.focus({ preventScroll: true }); }, [path]);

  const overCount = useMemo(() => budgetRows(state, scope, monthOf(today), today).filter((r) => r.state === 'over').length, [state, scope, today]);

  if (!state.onboarded) return <Onboarding />;

  const page = (() => {
    switch (path) {
      case '/activity': return <Activity />;
      case '/budgets': return <Budgets />;
      case '/forecast': return <Forecast />;
      case '/accounts': return <Accounts />;
      case '/bills': return <Bills />;
      case '/invest': return <Invest />;
      case '/settings': return <Settings />;
      default: return <Home />;
    }
  })();

  const mobile = [NAV[0], NAV[1], NAV[2], NAV[3]];
  const moreActive = !mobile.some((n) => n.to === path);

  return (
    <>
      <div className="app">
        <nav className="sidebar" aria-label="Main">
          <a className="brand" href="#/"><img className="brand-mark" src={`${import.meta.env.BASE_URL}favicon/android-chrome-192x192.png`} alt="" /><span>Budge</span></a>
          <WhoSwitch variant="side" />
          <button type="button" className="palette-btn" onClick={() => setPalette(true)}><Search /><span>Search or log…</span><span className="kbd">⌘K</span></button>
          <div className="nav-links">
            {NAV.map((n) => (
              <a key={n.to} href={`#${n.to}`} aria-current={path === n.to || (n.to === '/' && !NAV.some((x) => x.to === path) && path !== '/settings') ? 'page' : undefined}>
                <n.icon /> {n.label}{n.to === '/budgets' && overCount > 0 && <span className="badge">{overCount}</span>}
              </a>
            ))}
          </div>
          <div className="sidebar-foot">
            <button type="button" className="nav-btn" onClick={() => navigate('/settings')}><Cog /> Settings & backup</button>
            <p className="local-note">Everything lives on this device. Back up from Settings.</p>
          </div>
        </nav>

        <main id="view" tabIndex={-1}>
          <div className="topbar"><a className="brand" href="#/"><img className="brand-mark" src={`${import.meta.env.BASE_URL}favicon/android-chrome-192x192.png`} alt="" /><span>Budge</span></a><WhoSwitch variant="top" /></div>
          <ErrorBoundary resetKey={path}>{page}</ErrorBoundary>
        </main>
      </div>

      {!['/forecast', '/settings', '/invest'].includes(path) && <button type="button" className="fab" onClick={() => openModal('tx')} aria-label="Add expense"><Plus /> <span>Add</span></button>}

      <nav className="bottom-nav" aria-label="Main">
        {mobile.map((n) => (
          <a key={n.to} href={`#${n.to}`} aria-current={path === n.to ? 'page' : undefined}><n.icon />{n.label}</a>
        ))}
        <button type="button" onClick={() => openModal('more')} style={moreActive ? { color: 'var(--ink)', fontWeight: 600 } : undefined}><Ellipsis />More</button>
      </nav>

      <ErrorBoundary compact onError={closeModal}><ModalHost /></ErrorBoundary>
      <Palette />
      <ToastHost />
      <Confetti />
      <div className="grain" aria-hidden="true" />
    </>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
