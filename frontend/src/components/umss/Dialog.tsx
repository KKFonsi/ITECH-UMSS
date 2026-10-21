import { useEffect, useRef, type ReactNode } from "react";

/** Native modal semantics provide focus trapping, Escape, and focus restoration. */
export function Dialog({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return <dialog ref={ref} className="umss-dialog" aria-label={title} onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    {children}
  </dialog>;
}
