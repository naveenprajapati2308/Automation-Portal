
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_RANGE } from './date-range.js';
import { getStoredRange, setStoredRange, subscribeRangeChange } from './date-range-sync.js';

export function useDateRange(scope, defaultRange = DEFAULT_RANGE) {
  const [range, setRangeState] = useState(() => getStoredRange(scope, defaultRange));

  useEffect(() => subscribeRangeChange(scope, setRangeState), [scope]);

  const setRange = useCallback((next) => {
    setRangeState(next);
    setStoredRange(scope, next);
  }, [scope]);

  return [range, setRange];
}
