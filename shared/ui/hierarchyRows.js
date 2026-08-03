
export function buildHierarchyRows(items, { getId = (item) => item.id, getParentId = (item) => item.parentId, expandedIds } = {}) {
  const idSet = new Set(items.map(getId));
  const childrenByParent = new Map();
  const roots = [];

  for (const item of items) {
    const parentId = getParentId(item);
    const hasKnownParent = parentId != null && idSet.has(parentId);
    if (!hasKnownParent) {
      roots.push(item);
    } else {
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push(item);
    }
  }

  const rows = [];
  for (const root of roots) {
    const children = childrenByParent.get(getId(root)) || [];
    rows.push({ ...root, __hasChildren: children.length > 0, __childCount: children.length, __isChild: false });
    if (expandedIds.has(getId(root))) {
      for (const child of children) rows.push({ ...child, __hasChildren: false, __childCount: 0, __isChild: true });
    }
  }
  return rows;
}
