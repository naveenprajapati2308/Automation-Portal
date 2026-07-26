import { useEffect, useRef, useState } from 'react';
import { PERFORMANCE_NAV } from '../../constants.js';
import { useIframeAutoHeight } from '../../lib/useIframeAutoHeight.js';
import { useIframeScrollLock } from '../../lib/useIframeScrollLock.js';
import { FullScreenLoader } from '../../../../../shared/ui/Loader.jsx';
import appLogo from '../../assets/testrix_logo.png';

const pathFor = (key) => PERFORMANCE_NAV.find((item) => item.key === key)?.path ?? '/';

export function PerformanceWorkspace({ activePage }) {
  const iframeRef = useRef(null);
  const height = useIframeAutoHeight(iframeRef);
  useIframeScrollLock(iframeRef);
  const [loaded, setLoaded] = useState(false);

  const [initialSrc] = useState(() => `/perf${pathFor(activePage)}`);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    win?.postMessage({ type: 'testrix:navigate', path: pathFor(activePage) }, window.location.origin);
  }, [activePage]);

  return (
    <>
      {!loaded && <FullScreenLoader logoSrc={appLogo} subtitle="Loading Performance Testing" />}
      <iframe
        ref={iframeRef}
        key="perf-embed"
        src={initialSrc}
        title="Performance Testing"
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height, border: 0, display: 'block' }}
      />
    </>
  );
}
