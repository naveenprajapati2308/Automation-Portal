import { useEffect } from 'react';
import { lockParentScroll } from '../../../../../shared/ui/iframe-scroll-lock.js';
import { useViewportBounds } from '../../../../../shared/ui/useViewportBounds.js';

// Shared overlay shell for every modal/dialog/drawer in API Testing — centralizes the
// behavior every one of them needs (backdrop, z-index, Escape-to-close, background scroll
// lock, iframe-safe positioning) so individual screens only own their content, not the
// overlay mechanics. See shared/ui/useViewportBounds.js for why plain CSS centering/height
// isn't enough once this page is embedded in the shell's auto-height iframe.
//
// `align`: 'center' (default, dialogs) or 'end' (right-side drawers).
export function ModalOverlay({ children, onClose, closeOnBackdrop = true, align = 'center' }) {
  const bounds = useViewportBounds();

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const unlockParent = lockParentScroll();
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      unlockParent();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const overlayStyle = bounds
    ? { position: 'absolute', top: bounds.top, left: 0, right: 0, height: bounds.height }
    : undefined;

  return (
    <div
      className={`fixed inset-0 bg-black/60 flex z-50 ${align === 'end' ? 'justify-end' : 'items-center justify-center'}`}
      style={{ ...overlayStyle, animation: 'modal-overlay-in 0.15s ease-out' }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={align === 'end' ? 'h-full' : ''}
        style={{ animation: align === 'end' ? 'modal-drawer-in 0.2s ease-out' : 'modal-in 0.15s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
