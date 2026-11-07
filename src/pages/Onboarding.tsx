import { useState } from 'react';
import { ConnectForm } from '../sync/SyncUI';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { demoState, emptyState } from '../lib/demo';
import { PROFILE_COLORS } from '../lib/ledger';
import { useApp } from '../lib/store';
import { Avatar } from '../ui/kit';

export default function Onboarding() {
  const { replaceAll, today } = useApp();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [cur, setCur] = useState('USD');
  const [connect, setConnect] = useState(false);
  const names: [string, string] = [a.trim() || 'Me', b.trim() || 'Wife'];
  const start = (demo: boolean) => {
    const base = demo ? demoState(today, names) : emptyState();
    replaceAll({ ...base, onboarded: true, profiles: [{ id: 'p1', name: names[0], color: PROFILE_COLORS[0] }, { id: 'p2', name: names[1], color: PROFILE_COLORS[1] }], settings: { ...base.settings, currency: cur } });
    location.hash = '/';
  };
  return (
    <div className="onboard">
      <div className="ob-card reveal">
        <div className="brand" style={{ padding: 0 }}><img className="brand-mark" src={`${import.meta.env.BASE_URL}favicon/android-chrome-192x192.png`} alt="" /><span>Budge</span></div>
        <h1 className="display" style={{ fontSize: 'clamp(34px, 6vw, 48px)' }}>Money, together.</h1>
        <p className="subline">Two profiles, one family view. Balances, bills, paydays, budgets, investments and a forecast that tells you what you can afford.</p>
        <div className="ob-people">
          <label className="ob-person"><Avatar profile={{ id: 'x', name: names[0], color: PROFILE_COLORS[0] }} size="lg" /><span className="field"><span className="label">First person</span><input autoFocus value={a} placeholder="Your name" onChange={(e) => setA(e.target.value)} /></span></label>
          <label className="ob-person"><Avatar profile={{ id: 'y', name: names[1], color: PROFILE_COLORS[1] }} size="lg" /><span className="field"><span className="label">Second person</span><input value={b} placeholder="Wife's name" onChange={(e) => setB(e.target.value)} /></span></label>
        </div>
        <div className="field"><span className="label">Currency</span>
          <select value={cur} onChange={(e) => setCur(e.target.value)}>{['USD', 'CAD', 'EUR', 'GBP', 'INR', 'AUD', 'JPY'].map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="actions">
          <button className="btn primary" onClick={() => start(false)}>Start fresh <ArrowRight /></button>
          <button className="btn" onClick={() => start(true)}><FlaskConical /> Explore with sample data</button>
        </div>
        <p className="help">Everything is stored on this device. You can erase the sample data in Settings any time.</p>
        <div className="ob-connect">
          <button type="button" className="link-btn" onClick={() => setConnect(!connect)}>{connect ? 'Hide' : 'Already use Budge on another phone? Connect to sync'}</button>
          {connect && <><p className="help">Enter the hub details from your other phone. Your data will download and replace this setup.</p><ConnectForm /></>}
        </div>
      </div>
    </div>
  );
}
