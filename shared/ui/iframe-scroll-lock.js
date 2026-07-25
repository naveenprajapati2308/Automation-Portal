
export function lockParentScroll() {
  if (window.self === window.top) return () => { }; // not embedded, nothing to do

  window.parent.postMessage({ type: 'testrix:scroll-lock', locked: true }, window.location.origin);
  return () => {
    window.parent.postMessage({ type: 'testrix:scroll-lock', locked: false }, window.location.origin);
  };
}
