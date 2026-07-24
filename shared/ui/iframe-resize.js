// When embedded in the Testrix shell's sidebar iframe (Automation Portal,
// API Testing), reports this document's content height to the parent so the
// shell can size the iframe to fit exactly. Without this, a fixed-height
// iframe scrolls *internally* whenever its content is taller — a second,
// inner scrollbar stacked on top of the shell page's own, which reads as a
// nested "app inside an app" even after the sidebar/topbar duplication is
// fixed. Call once on mount; the ResizeObserver keeps reporting on every
// tab switch or content change for as long as the component is mounted.
export function reportHeightToParent() {
  if (window.self === window.top) return () => {}; // not embedded, nothing to do

  const post = () => {
    window.parent.postMessage(
      { type: 'testrix:resize', height: document.body.scrollHeight },
      window.location.origin
    );
  };

  // Observe <body>, not <html>: the <html> box is the viewport's initial
  // containing block, so it mostly tracks the viewport and barely reacts
  // when in-page content shrinks (a row collapsing, a page-size change,
  // fewer records after a filter). <body> is a plain block box that always
  // sizes to its content, so this is what actually fires when the page gets
  // shorter — without it the iframe only ever grows, never shrinks back
  // down, leaving dead scrollable space below the real content.
  const observer = new ResizeObserver(post);
  observer.observe(document.body);
  post();
  return () => observer.disconnect();
}
