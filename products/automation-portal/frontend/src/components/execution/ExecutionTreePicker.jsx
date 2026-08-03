import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Calendar } from 'lucide-react';

const moduleKey = (m) => `${m.code}::${m.runnerType}`;
const execModuleKey = (e) => `${e.moduleCode}::${e.framework}`;

function buildModuleTree(modules) {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const childrenByParent = new Map();
  const topLevel = [];
  for (const m of modules) {
    if (m.parentModuleId && byId.has(m.parentModuleId)) {
      if (!childrenByParent.has(m.parentModuleId)) childrenByParent.set(m.parentModuleId, []);
      childrenByParent.get(m.parentModuleId).push(m);
    } else {
      topLevel.push(m);
    }
  }
  return { topLevel, childrenByParent };
}

// Resolves which module (if any) an execution belongs to, so ExecutionCode/moduleCode strings
// become an actual node in the Parent -> Child -> Execution tree. Executions with no resolvable
// module (a deleted/renamed module, or an ALL_MODULES/XML_SUITE run with no single module) are
// never dropped — they fall into a flat "Other Executions" bucket instead.
export function ExecutionTreePicker({
  modules = [],
  executions = [],
  value,
  onChange,
  placeholder,
  accent = 'violet',
  restrictToModuleKey = null
}) {
  const [open, setOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const { topLevel, childrenByParent } = useMemo(() => buildModuleTree(modules), [modules]);

  const execsFor = (m) => executions
    .filter((e) => e.moduleCode === m.code && e.framework === m.runnerType)
    .sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0));

  const orphanExecs = useMemo(() => executions.filter(
    (e) => !modules.some((m) => m.code === e.moduleCode && m.runnerType === e.framework)
  ), [executions, modules]);

  const selected = executions.find((e) => e.id === value) || null;

  const toggleModule = (id) => setExpandedModules((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleGroup = (id) => setExpandedGroups((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const pick = (execId) => { onChange(execId); setOpen(false); };

  const ExecButton = ({ e }) => (
    <button
      type="button"
      key={e.id}
      className={`cp-tree-exec${e.id === value ? ' selected' : ''}`}
      onClick={() => pick(e.id)}
    >
      <span className="cp-tree-exec-code">{e.executionCode}</span>
      <span className="cp-tree-exec-meta">
        {e.suiteName ? `${e.suiteName} · ` : ''}{e.passRate ?? 0}% Pass
      </span>
    </button>
  );

  // When the other selector already has a value, only that exact module's branch stays visible
  // — sibling parents/children (and any executions belonging to them) are hidden outright rather
  // than shown-then-rejected, per "prevent invalid selections through UI filtering, not an error
  // after selection".
  const visibleTopLevel = topLevel.filter((m) => {
    if (!restrictToModuleKey) return true;
    if (moduleKey(m) === restrictToModuleKey) return true;
    return (childrenByParent.get(m.id) || []).some((c) => moduleKey(c) === restrictToModuleKey);
  });
  const visibleOrphans = orphanExecs.filter(
    (e) => !restrictToModuleKey || execModuleKey(e) === restrictToModuleKey
  );

  return (
    <div className={`cp-tree-select cp-tree-${accent}`} ref={rootRef}>
      <button type="button" className={`cp-tree-trigger cp-tree-trigger-${accent}`} onClick={() => setOpen((v) => !v)}>
        <Calendar size={17} />
        <span className="cp-tree-trigger-text">
          {selected ? `${selected.executionCode} (${selected.passRate ?? 0}% Pass)` : placeholder}
        </span>
        <ChevronDown size={16} className={`cp-tree-chev${open ? ' open' : ''}`} />
      </button>

      {open && (
        <div className="cp-tree-panel">
          {visibleTopLevel.length === 0 && visibleOrphans.length === 0 && (
            <div className="cp-tree-empty">No matching executions.</div>
          )}

          {visibleTopLevel.map((parent) => {
            const children = (childrenByParent.get(parent.id) || [])
              .filter((c) => !restrictToModuleKey || moduleKey(c) === restrictToModuleKey);
            const parentExecs = (!restrictToModuleKey || moduleKey(parent) === restrictToModuleKey)
              ? execsFor(parent) : [];
            const childrenWithExecs = children
              .map((c) => ({ module: c, execs: execsFor(c) }))
              .filter((c) => c.execs.length > 0);
            if (children.length === 0 && parentExecs.length === 0) return null;
            if (childrenWithExecs.length === 0 && parentExecs.length === 0) return null;

            const parentOpen = !!restrictToModuleKey || expandedModules.has(parent.id);

            return (
              <div key={parent.id} className="cp-tree-node">
                <button type="button" className="cp-tree-row cp-tree-row-parent" onClick={() => toggleModule(parent.id)}>
                  {parentOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>{parent.name}</span>
                  <em>{parent.runnerType}</em>
                </button>
                {parentOpen && (
                  <div className="cp-tree-children">
                    {childrenWithExecs.map(({ module: child, execs: childExecs }) => {
                      const childOpen = !!restrictToModuleKey || expandedGroups.has(child.id);
                      return (
                        <div key={child.id} className="cp-tree-node">
                          <button type="button" className="cp-tree-row cp-tree-row-child" onClick={() => toggleGroup(child.id)}>
                            {childOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <span>{child.name}</span>
                            <em>{childExecs.length}</em>
                          </button>
                          {childOpen && (
                            <div className="cp-tree-execs">
                              {childExecs.map((e) => <ExecButton key={e.id} e={e} />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {parentExecs.length > 0 && (
                      <div className="cp-tree-node">
                        {childrenWithExecs.length > 0 && <div className="cp-tree-group-label">Direct / combined runs</div>}
                        <div className="cp-tree-execs">
                          {parentExecs.map((e) => <ExecButton key={e.id} e={e} />)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {visibleOrphans.length > 0 && (
            <div className="cp-tree-node">
              <div className="cp-tree-row cp-tree-row-parent cp-tree-row-static">
                <span>Other Executions</span>
                <em>no module match</em>
              </div>
              <div className="cp-tree-children">
                <div className="cp-tree-execs">
                  {visibleOrphans
                    .sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0))
                    .map((e) => <ExecButton key={e.id} e={e} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
