
export function reportHeightToParent() {
  if (window.self === window.top) return () => { }; // not embedded, nothing to do

  const post = () => {
    window.parent.postMessage(
      { type: 'testrix:resize', height: document.body.scrollHeight },
      window.location.origin
    );
  };

  const observer = new ResizeObserver(post);
  observer.observe(document.body);
  post();
  return () => observer.disconnect();
}
