// When a modal opens inside an embedded product (Automation Portal, API Testing), the shell's
// OUTER document is what actually scrolls — not this iframe's own document, which
// iframe-resize.js keeps sized to exactly fit its content. So "lock background scroll while a
// modal is open" has to reach across the frame boundary: this posts a message the shell listens
// for (see lib/useIframeScrollLock.js) and toggles `document.body.style.overflow` itself.
// Call `lock()` when a modal/dialog mounts and the returned function when it unmounts.
export function lockParentScroll() {
  if (window.self === window.top) return () => {}; // not embedded, nothing to do

  window.parent.postMessage({ type: 'testrix:scroll-lock', locked: true }, window.location.origin);
  return () => {
    window.parent.postMessage({ type: 'testrix:scroll-lock', locked: false }, window.location.origin);
  };
}
