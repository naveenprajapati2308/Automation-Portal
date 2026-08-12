


const ACTION_HANDLERS = {};

/**
 * Register a handler for an action id.
 * @param {string}   id       — matches item.nav.action
 * @param {Function} handler  — called with the nav context when dispatched
 */
export function registerAction(id, handler) {
  if (typeof handler !== 'function') {
    console.warn('[searchActions] handler must be a function:', id);
    return;
  }
  ACTION_HANDLERS[id] = handler;
}

/**
 * Unregister an action handler.
 */
export function unregisterAction(id) {
  delete ACTION_HANDLERS[id];
}

/**
 * Dispatch an action by id.
 * @param {string} id     — action identifier from item.nav.action
 * @param {object} [ctx]  — optional context (the full nav object)
 */
export function dispatchSearchAction(id, ctx) {
  const handler = ACTION_HANDLERS[id];
  if (handler) {
    handler(ctx);
  } else {
    // No explicit action handler — navigation already handles the page jump.
    // This is a safe no-op for items that rely solely on nav.page + nav.sub.
  }
}

/**
 * List all currently registered action ids. For debugging.
 */
export function listActions() {
  return Object.keys(ACTION_HANDLERS);
}
