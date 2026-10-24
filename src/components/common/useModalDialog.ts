import {useEffect, useRef, type KeyboardEvent} from 'react';

const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour for a modal dialog (same idiom as the Smart Playbook tour):
 * focus moves inside when it opens, Tab and Shift+Tab stay inside, Escape calls
 * onClose, and focus returns to the element that opened it when it closes.
 * Attach `ref` and `onKeyDown` to the element that carries role="dialog".
 */
export function useModalDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  // Read the opener during the render that opens the dialog, before autoFocus moves focus inside.
  if (open && !wasOpen.current) opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
  wasOpen.current = open;

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (node && !node.contains(document.activeElement)) (node.querySelector<HTMLElement>(FOCUSABLE) || node).focus();
    const back = opener.current;
    return () => { if (back?.isConnected) back.focus(); };
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<T>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) { event.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !ref.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !ref.current.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return {ref, onKeyDown};
}
