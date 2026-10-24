import {useEffect, useRef, type KeyboardEvent} from 'react';

const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour for a modal dialog (same idiom as the Smart Playbook tour):
 * focus moves inside when it opens, Tab and Shift+Tab stay inside, Escape calls
 * onClose, and focus returns to the element that opened it when it closes.
 * If the focused control is disabled or removed while the dialog is open (a submit
 * button while saving, Back on the first step), focus moves to the dialog itself, and
 * Escape and Tab keep working even if focus has already fallen to the page.
 * Attach `ref` and `onKeyDown` to the element that carries role="dialog".
 */
export function useModalDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;
  // Read the opener during the render that opens the dialog, before autoFocus moves focus inside.
  if (open && !wasOpen.current) opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
  wasOpen.current = open;

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
    if (!node.contains(document.activeElement)) (node.querySelector<HTMLElement>(FOCUSABLE) || node).focus();

    const recover = () => {
      const active = document.activeElement as (HTMLElement & {disabled?: boolean}) | null;
      if (node.isConnected && (!active || active === document.body || !node.contains(active) || active.disabled)) node.focus({preventScroll: true});
    };
    const observer = new MutationObserver(recover);
    observer.observe(node, {subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'hidden']});

    // Keys that arrive while focus is outside the dialog (already lost) still act on it.
    const onDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.target instanceof Node && node.contains(event.target)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        const items = node.querySelectorAll<HTMLElement>(FOCUSABLE);
        (items[event.shiftKey ? items.length - 1 : 0] || node).focus();
      }
    };
    document.addEventListener('keydown', onDocumentKeyDown);

    const back = opener.current;
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onDocumentKeyDown);
      if (back?.isConnected) back.focus();
    };
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<T>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close.current();
      return;
    }
    if (event.key !== 'Tab' || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) { event.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    // The dialog itself holds focus after a recovery; Tab from it goes to the first or last control.
    const outside = active === ref.current || !ref.current.contains(active);
    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  };

  return {ref, onKeyDown};
}
