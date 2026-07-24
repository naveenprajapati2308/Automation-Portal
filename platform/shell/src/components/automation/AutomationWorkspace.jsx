import { useEffect, useRef, useState } from 'react';
import { useIframeAutoHeight } from '../../lib/useIframeAutoHeight.js';
import { useIframeScrollLock } from '../../lib/useIframeScrollLock.js';
import { FullScreenLoader } from '../../../../../shared/ui/Loader.jsx';
import appLogo from '../../assets/testrix_logo.png';

export function AutomationWorkspace({ activePage }) {
  const iframeRef = useRef(null);
  const height = useIframeAutoHeight(iframeRef);
  useIframeScrollLock(iframeRef);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const target = `#/${activePage}`;
    if (win.location.hash !== target) win.location.hash = target;
  }, [activePage]);

  return (
    <>
      {/* Lives in the shell itself — fixed to the whole viewport, never
          inside the resizing iframe — so it can never appear to scroll. */}
      {!loaded && <FullScreenLoader logoSrc={appLogo} subtitle="Loading Automation" />}
      <iframe
        ref={iframeRef}
        key="automation-embed"
        src={`/automation/#/${activePage}`}
        title="Automation"
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height, border: 0, display: 'block' }}
      />
    </>
  );
}
