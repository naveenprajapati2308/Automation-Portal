// Recipe for any dashboard (present or future) that needs the Global Date Range Filter:
//   1. const [range, setRange] = useDateRange(DATE_RANGE_SCOPES.X, '7d');
//   2. Render <DateRangeFilter value={range} onChange={setRange} /> next to the page title.
//   3. Keep one loadData(range)-style function (Promise.all/query array) keyed on [range].
//   4. Translate `range` into whatever shape a given backend expects only at the fetch call site.
// Never duplicate the state/persistence logic below in a product-specific hook.
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
