import { useRef, useState } from 'react';
import { useIframeAutoHeight } from '../../lib/useIframeAutoHeight.js';
import { useIframeScrollLock } from '../../lib/useIframeScrollLock.js';
import { FullScreenLoader } from '../../../../../shared/ui/Loader.jsx';
import appLogo from '../../assets/testrix_logo.png';


export function AdminEnvironmentsEmbed() {
  const iframeRef = useRef(null);
  const height = useIframeAutoHeight(iframeRef);
  useIframeScrollLock(iframeRef);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <FullScreenLoader logoSrc={appLogo} subtitle="Loading Environments" />}
      <iframe
        ref={iframeRef}
        key="admin-environments-embed"
        src="/automation/#/environments"
        title="Environments"
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height, border: 0, display: 'block' }}
      />
    </>
  );
}
