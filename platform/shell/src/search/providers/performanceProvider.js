/**
 * performanceProvider.js
 * ──────────────────────
 * Search items for the Performance Testing module.
 * All items are currently disabled (coming soon).
 * They appear in search results with a SOON badge but are not navigable.
 */
import { ENTITY_TYPE, PROVIDER_TYPE } from '../core/searchTypes.js';

const ITEMS = [
  {
    id:          'perf-home',
    entityType:  ENTITY_TYPE.PAGE,
    module:      'Performance',
    category:    'Pages',
    page:        'Performance Testing',
    section:     null,
    description: 'Performance Testing module — load tests, stress tests, response time analysis. Coming soon.',
    icon:        'Gauge',
    badge:       'SOON',
    navPath:     'Performance Testing',
    nav:         { page: 'perf', sub: null, tab: null, section: null, anchor: null, action: null },
    keywords:    ['performance', 'load test', 'stress test', 'response time', 'throughput', 'jmeter', 'k6'],
    synonyms:    ['load testing', 'performance test', 'stress testing', 'benchmarking'],
    acronyms:    ['pt'],
    disabled:    true,   // shown with SOON badge, not clickable
    permission:  null,
    metadata:    {},
  },
  {
    id:          'perf-report',
    entityType:  ENTITY_TYPE.REPORT,
    module:      'Performance',
    category:    'Reports',
    page:        'Performance Report',
    section:     null,
    description: 'Performance test report — response times, throughput, error rates. Coming soon.',
    icon:        'Gauge',
    badge:       'SOON',
    navPath:     'Performance › Reports',
    nav:         { page: 'perf', sub: null, tab: null, section: null, anchor: null, action: null },
    keywords:    ['performance report', 'load report', 'benchmark report', 'response time report'],
    synonyms:    ['performance results', 'load test report'],
    acronyms:    [],
    disabled:    true,
    permission:  null,
    metadata:    {},
  },
];

export const performanceProvider = {
  id:       'performance',
  type:     PROVIDER_TYPE.STATIC,
  priority: 25,
  getItems: () => ITEMS,
};
