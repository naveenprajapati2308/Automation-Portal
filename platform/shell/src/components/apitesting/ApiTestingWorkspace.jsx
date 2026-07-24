import { useEffect, useRef, useState } from 'react';
import { API_TESTING_NAV } from '../../constants.js';
import { useIframeAutoHeight } from '../../lib/useIframeAutoHeight.js';
import { useIframeScrollLock } from '../../lib/useIframeScrollLock.js';
import { FullScreenLoader } from '../../../../../shared/ui/Loader.jsx';
import appLogo from '../../assets/testrix_logo.png';

const pathFor = (key) => API_TESTING_NAV.find((item) => item.key === key)?.path ?? '/';

export function ApiTestingWorkspace({ activePage }) {
  const iframeRef = useRef(null);
  const height = useIframeAutoHeight(iframeRef);
  useIframeScrollLock(iframeRef);
  const [loaded, setLoaded] = useState(false);

  const [initialSrc] = useState(() => `/apitest${pathFor(activePage)}`);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    win?.postMessage({ type: 'testrix:navigate', path: pathFor(activePage) }, window.location.origin);
  }, [activePage]);

  return (
    <>
      {/* Lives in the shell itself — fixed to the whole viewport, never
          inside the resizing iframe — so it can never appear to scroll. */}
      {!loaded && <FullScreenLoader logoSrc={appLogo} subtitle="Loading API Testing" />}
      <iframe
        ref={iframeRef}
        key="apitest-embed"
        src={initialSrc}
        title="API Testing"
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height, border: 0, display: 'block' }}
      />
    </>
  );
}
