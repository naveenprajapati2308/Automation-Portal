import { useEffect } from 'react';

let lockCount = 0;
let prevOverflow = null;

function applyLock(locked) {
  lockCount = Math.max(0, lockCount + (locked ? 1 : -1));
  if (lockCount > 0 && prevOverflow === null) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else if (lockCount === 0 && prevOverflow !== null) {
    document.body.style.overflow = prevOverflow;
    prevOverflow = null;
  }
}
// function for the ser for autoscroll functionality .

export function useIframeScrollLock(iframeRef) {
  useEffect(() => {
    let ownedLocks = 0; // this iframe's own outstanding locks, so we can release them if it's torn down mid-modal
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'testrix:scroll-lock') return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const locked = !!event.data.locked;
      ownedLocks = Math.max(0, ownedLocks + (locked ? 1 : -1));
      applyLock(locked);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      // Iframe navigated away or was unmounted (e.g. user switched product tabs) while a modal
      // it opened was still tracked as locking scroll — release whatever it still owes so the
      // shell doesn't stay stuck with scroll disabled forever.
      while (ownedLocks > 0) { applyLock(false); ownedLocks--; }
    };
  }, [iframeRef]);
}
