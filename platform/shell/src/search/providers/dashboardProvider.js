/**
 * dashboardProvider.js
 * ────────────────────
 * Search items for the Dashboard module.
 */
import { ENTITY_TYPE, PROVIDER_TYPE } from '../core/searchTypes.js';

const ITEMS = [
  {
    id:          'dash-home',
    entityType:  ENTITY_TYPE.PAGE,
    module:      'Dashboard',
    category:    'Pages',
    page:        'Dashboard',
    section:     null,
    description: 'Unified overview of all testing products — Automation, API and Performance.',
    icon:        'LayoutDashboard',
    badge:       null,
    navPath:     'Dashboard',
    nav:         { page: 'dashboard', sub: null, tab: null, section: null, anchor: null, action: null },
    keywords:    ['dashboard', 'home', 'overview', 'main', 'global', 'portal', 'landing'],
    synonyms:    ['home page', 'main page', 'start'],
    acronyms:    [],
    disabled:    false,
    permission:  null,
    metadata:    {},
  },
  {
    id:          'dash-automation-card',
    entityType:  ENTITY_TYPE.CARD,
    module:      'Dashboard',
    category:    'Dashboard',
    page:        'Automation Overview Card',
    section:     'Dashboard',
    description: 'Quick KPI card for Automation — total executions, pass rate, running status.',
    icon:        'Play',
    badge:       null,
    navPath:     'Dashboard › Automation Card',
    nav:         { page: 'dashboard', sub: null, tab: null, section: null, anchor: 'auto-overview-card', action: null },
    keywords:    ['automation', 'card', 'kpi', 'executions', 'pass rate', 'dashboard'],
    synonyms:    ['automation widget', 'automation stats'],
    acronyms:    [],
    disabled:    false,
    permission:  null,
    metadata:    {},
  },
  {
    id:          'dash-api-card',
    entityType:  ENTITY_TYPE.CARD,
    module:      'Dashboard',
    category:    'Dashboard',
    page:        'API Testing Overview Card',
    section:     'Dashboard',
    description: 'Quick KPI card for API Testing — total executions, success rate, active schedules.',
    icon:        'Globe2',
    badge:       null,
    navPath:     'Dashboard › API Testing Card',
    nav:         { page: 'dashboard', sub: null, tab: null, section: null, anchor: 'api-overview-card', action: null },
    keywords:    ['api', 'api testing', 'card', 'kpi', 'success rate', 'schedules', 'dashboard'],
    synonyms:    ['api widget', 'api stats'],
    acronyms:    ['at'],
    disabled:    false,
    permission:  null,
    metadata:    {},
  },
];

export const dashboardProvider = {
  id:       'dashboard',
  type:     PROVIDER_TYPE.STATIC,
  priority: 5,
  getItems: () => ITEMS,
};
