import { useEffect, useState } from 'react';
import { Hub, type HubState, type RemoteRow } from '../hub/hub';
import { SYNC_TABLES } from './model';

/** The one Hub instance for Budge. Remote rows are routed to whichever handler the SyncBridge installs. */
let handler: ((rows: RemoteRow[]) => void | Promise<void>) | null = null;
export const setRemoteHandler = (h: typeof handler) => { handler = h; };

export const hub = new Hub({
  app: 'budge',
  tables: [...SYNC_TABLES],
  dbName: 'budge-hub',
  onRemote: (rows) => handler?.(rows),
});

export function useHubState(): HubState {
  const [s, setS] = useState<HubState>(hub.state);
  useEffect(() => hub.subscribe(setS), []);
  return s;
}

/** Hooks the bridge registers so connect/disconnect can switch diffing on and off. */
export const ctl: { enable: () => void; disable: () => void } = { enable: () => {}, disable: () => {} };

export async function connectHub(cfg: { url: string; apiKey: string; passphrase: string }): Promise<void> {
  await hub.configure(cfg);   // verifies URL + key + passphrase before saving anything
  await hub.sync();           // pull first, so this phone adopts what's already there instead of overwriting it
  ctl.enable();               // from now on local changes are diffed and uploaded
}

export async function disconnectHub(): Promise<void> {
  ctl.disable();
  await hub.disconnect();
}
