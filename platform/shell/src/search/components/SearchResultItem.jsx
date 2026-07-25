/**
 * SearchResultItem.jsx
 * ────────────────────
 * Renders a single search result row inside the dropdown.
 * Handles: icon, title highlight, navPath breadcrumb, badges, entity-type chip,
 * disabled state, keyboard selection highlighting.
 */
import { memo } from 'react';
import {
  BookOpen, CalendarClock, Camera, Database, FileText, FolderTree,
  Gauge, GitCompare, Globe2, History, KeyRound, LayoutDashboard, Package,
  Play, Send, Shield, Sliders, TerminalSquare, Users, UserCog, Workflow, Zap
} from 'lucide-react';
import { SearchHighlight } from './SearchHighlight.jsx';
import { ENTITY_LABEL } from '../core/searchTypes.js';

const ICON_MAP = {
  BookOpen, CalendarClock, Camera, Database, FileText, FolderTree,
  Gauge, GitCompare, Globe2, History, KeyRound, LayoutDashboard, Package,
  Play, Send, Shield, Sliders, TerminalSquare, Users, UserCog, Workflow, Zap,
};

const BADGE_STYLE = {
  SOON: { background: 'rgba(251,191,36,0.15)', color: '#f59e0b', border: '1px solid rgba(251,191,36,0.3)' },
  BETA: { background: 'rgba(96,179,224,0.15)',  color: '#60b3e0', border: '1px solid rgba(96,179,224,0.3)' },
  NEW:  { background: 'rgba(74,222,128,0.15)',  color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
};

const ENTITY_CHIP_STYLE = {
  page:       { background: 'rgba(96,179,224,0.12)',  color: '#60b3e0' },
  action:     { background: 'rgba(74,222,128,0.12)',  color: '#4ade80' },
  section:    { background: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  report:     { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
  setting:    { background: 'rgba(249,115,22,0.12)',  color: '#f97316' },
  docs:       { background: 'rgba(96,179,224,0.12)',  color: '#60b3e0' },
  card:       { background: 'rgba(96,179,224,0.08)',  color: '#94a3b8' },
  tab:        { background: 'rgba(96,179,224,0.08)',  color: '#94a3b8' },
};

/**
 * @param {{
 *   item:        object,
 *   query:       string,
 *   isSelected:  boolean,
 *   onSelect:    (item: object) => void,
 *   style?:      object,
 * }} props
 */
export const SearchResultItem = memo(function SearchResultItem({ item, query, isSelected, onSelect, style }) {
  const Icon = ICON_MAP[item.icon] || LayoutDashboard;
  const entityLabel = ENTITY_LABEL[item.entityType] || item.entityType;
  const chipStyle   = ENTITY_CHIP_STYLE[item.entityType] || ENTITY_CHIP_STYLE.page;
  const badgeStyle  = item.badge ? BADGE_STYLE[item.badge] : null;

  const handleClick = () => {
    if (!item.disabled) onSelect(item);
  };

  return (
    <button
      type="button"
      className={`search-result-item ${isSelected ? 'selected' : ''} ${item.disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      style={style}
      disabled={item.disabled}
      title={item.description || item.page}
    >
      {/* Icon */}
      <span className="sri-icon">
        <Icon size={15} />
      </span>

      {/* Main content */}
      <span className="sri-body">
        <span className="sri-title">
          <SearchHighlight text={item.page} query={query} />
          {/* Entity type chip */}
          <span className="sri-entity-chip" style={chipStyle}>
            {entityLabel}
          </span>
          {/* Badge */}
          {badgeStyle && (
            <span className="sri-badge" style={badgeStyle}>
              {item.badge}
            </span>
          )}
        </span>
        <span className="sri-path">{item.navPath}</span>
      </span>

      {/* Right arrow (only non-disabled) */}
      {!item.disabled && (
        <span className="sri-arrow">›</span>
      )}
    </button>
  );
});
