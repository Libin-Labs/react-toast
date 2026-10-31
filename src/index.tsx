'use client';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}
export interface ToastInput {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  variant?: 'info' | 'success' | 'error';
  duration?: number;
  action?: ToastAction;
}
export interface ToastRecord extends ToastInput {
  id: string;
  duration: number;
}
export interface ToastApi {
  notify: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  update: (id: string, patch: Partial<ToastInput>) => void;
}
const Context = createContext<ToastApi | null>(null);
export function useToast() {
  const api = useContext(Context);
  if (!api) throw new Error('useToast requires ToastProvider.');
  return api;
}
function ToastItem({
  toast,
  dismiss,
  render,
}: {
  toast: ToastRecord;
  dismiss: (id: string) => void;
  render?: (toast: ToastRecord, dismiss: () => void) => ReactNode;
}) {
  const paused = useRef(new Set<string>());
  const controls = useRef({ pause: (_reason: string) => {}, resume: (_reason: string) => {} });
  const callback = useRef(dismiss);
  callback.current = dismiss;
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (toast.duration === 0) return;
    let remaining = toast.duration;
    let started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (paused.current.size || remaining <= 0) return;
      started = Date.now();
      timer = setTimeout(() => callback.current(toast.id), remaining);
    };
    controls.current = {
      pause: (reason) => {
        if (!paused.current.size) {
          if (timer) clearTimeout(timer);
          remaining = Math.max(0, remaining - (Date.now() - started));
        }
        paused.current.add(reason);
      },
      resume: (reason) => {
        paused.current.delete(reason);
        if (!paused.current.size) {
          if (remaining <= 0) callback.current(toast.id);
          else schedule();
        }
      },
    };
    const visibility = () => {
      if (document.hidden) controls.current.pause('hidden');
      else controls.current.resume('hidden');
    };
    if (document.hidden) paused.current.add('hidden');
    schedule();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [toast.id, toast.duration]);
  return (
    <li
      onPointerEnter={() => controls.current.pause('hover')}
      onPointerLeave={() => controls.current.resume('hover')}
      onFocus={() => controls.current.pause('focus')}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          controls.current.resume('focus');
      }}
      style={{
        pointerEvents: 'auto',
        padding: 12,
        border: '1px solid GrayText',
        borderRadius: 6,
        background: 'Canvas',
        color: 'CanvasText',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {render ? (
        render(toast, () => dismiss(toast.id))
      ) : (
        <>
          <div role={toast.variant === 'error' ? 'alert' : 'status'}>
            <strong>{toast.title}</strong>
            {toast.description && <div>{toast.description}</div>}
          </div>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                Promise.resolve()
                  .then(() => toast.action!.onClick())
                  .then(() => {
                    if (alive.current) dismiss(toast.id);
                  })
                  .catch((reason) => {
                    if (alive.current)
                      setError(reason instanceof Error ? reason.message : String(reason));
                  });
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
            Close
          </button>
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </li>
  );
}
export function ToastProvider({
  children,
  maxVisible = 3,
  maxQueued = 50,
  defaultDuration = 5000,
  position = 'bottom-right',
  renderToast,
  style,
}: {
  children?: ReactNode;
  maxVisible?: number;
  maxQueued?: number;
  defaultDuration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  renderToast?: (toast: ToastRecord, dismiss: () => void) => ReactNode;
  style?: CSSProperties;
}) {
  if (
    !Number.isInteger(maxVisible) ||
    maxVisible < 1 ||
    maxVisible > 10 ||
    !Number.isInteger(maxQueued) ||
    maxQueued < maxVisible ||
    maxQueued > 1000 ||
    !Number.isFinite(defaultDuration) ||
    defaultDuration < 0 ||
    defaultDuration > 600000 ||
    !['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(position)
  )
    throw new RangeError('Invalid toast limits.');
  const [items, setItems] = useState<ToastRecord[]>([]);
  const reference = useRef(items);
  reference.current = items;
  const count = useRef(0);
  const prefix = useId();
  const commit = (next: ToastRecord[]) => {
    reference.current = next;
    setItems(next);
  };
  const validate = (toast: ToastRecord) => {
    if (
      !toast.id ||
      toast.id.length > 128 ||
      !Number.isFinite(toast.duration) ||
      toast.duration < 0 ||
      toast.duration > 600000
    )
      throw new RangeError('Invalid toast id/duration.');
  };
  const dismiss = (id: string) => commit(reference.current.filter((toast) => toast.id !== id));
  const notify = (input: ToastInput) => {
    const toast: ToastRecord = {
      ...input,
      id: input.id ?? `${prefix}-${++count.current}`,
      duration: input.duration ?? defaultDuration,
    };
    validate(toast);
    const existing = reference.current.findIndex((item) => item.id === toast.id);
    if (existing < 0 && reference.current.length >= maxQueued)
      throw new RangeError('Toast queue is full.');
    commit(
      existing < 0
        ? [...reference.current, toast]
        : reference.current.map((item) => (item.id === toast.id ? toast : item)),
    );
    return toast.id;
  };
  const update = (id: string, patch: Partial<ToastInput>) => {
    const old = reference.current.find((item) => item.id === id);
    if (!old) return;
    const next = { ...old, ...patch, id, duration: patch.duration ?? old.duration };
    validate(next);
    commit(reference.current.map((item) => (item.id === id ? next : item)));
  };
  return (
    <Context.Provider value={{ notify, dismiss, update, clear: () => commit([]) }}>
      {children}
      <ol
        aria-label="Notifications"
        style={{
          position: 'fixed',
          zIndex: 1100,
          [position.startsWith('top') ? 'top' : 'bottom']: 16,
          [position.endsWith('left') ? 'left' : 'right']: 16,
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          display: 'grid',
          gap: 8,
          padding: 0,
          margin: 0,
          listStyle: 'none',
          pointerEvents: 'none',
          ...style,
        }}
      >
        {items.slice(0, maxVisible).map((toast) => (
          <ToastItem key={toast.id} toast={toast} dismiss={dismiss} render={renderToast} />
        ))}
      </ol>
    </Context.Provider>
  );
}
export default ToastProvider;
