import { useEffect, useState } from 'react';

export function useIframeAutoHeight(iframeRef, fallback = 'calc(100vh - 120px)') {
  const [height, setHeight] = useState(fallback);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'testrix:resize') return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      setHeight(`${event.data.height}px`);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframeRef]);

  return height;
}
