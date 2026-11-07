import { useMemo } from 'react';
import { forecast, safeToSpend } from './forecast';
import { useApp } from './store';

export function useForecast(days: number) {
  const { state, scope, today, bal } = useApp();
  return useMemo(() => forecast(state, scope, days, today, bal), [state, scope, today, bal, days]);
}

export function useSafeToSpend() {
  const { state, scope, today, bal } = useApp();
  return useMemo(() => safeToSpend(state, scope, today, bal), [state, scope, today, bal]);
}

export function useReveal(i = 0) {
  return { className: 'reveal', style: { ['--d' as string]: `${0.04 * i}s` } as React.CSSProperties };
}
