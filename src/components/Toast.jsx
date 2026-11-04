// Hệ thống Thông báo nổi (Toast + Hoàn tác) & Hộp thoại Xác nhận dùng chung toàn app
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, RotateCcw, X, Sparkles } from 'lucide-react';
import { Button, Modal, cx } from './ui.jsx';
import { uid } from '../lib/utils.js';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [confettiBurst, setConfettiBurst] = useState(null);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ message, tone = 'success', duration = 5000, onUndo, undoLabel = 'Hoàn tác' }) => {
      const id = uid();
      const item = { id, message, tone, onUndo, undoLabel };
      setToasts((prev) => [...prev.slice(-3), item]);
      timersRef.current[id] = setTimeout(() => dismiss(id), onUndo ? Math.max(duration, 6000) : duration);
      return id;
    },
    [dismiss]
  );

  const confirm = useCallback(
    ({
      title = 'Xác nhận thao tác',
      message = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
      confirmLabel = 'Đồng ý',
      cancelLabel = 'Hủy',
      danger = false,
    }) =>
      new Promise((resolve) => {
        setConfirmState({
          title,
          message,
          confirmLabel,
          cancelLabel,
          danger,
          resolve,
        });
      }),
    []
  );

  const closeConfirm = (result) => {
    if (confirmState?.resolve) confirmState.resolve(Boolean(result));
    setConfirmState(null);
  };

  const celebrate = useCallback((text = 'Tuyệt vời! Bạn đã hoàn thành xuất sắc 🎉') => {
    const key = uid();
    setConfettiBurst({ key, text });
    setTimeout(() => {
      setConfettiBurst((curr) => (curr?.key === key ? null : curr));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ toast, dismiss, confirm, celebrate }), [toast, dismiss, confirm, celebrate]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Khay Toast góc dưới bên phải */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed bottom-14 right-4 z-[120] flex max-w-md flex-col gap-2">
            {toasts.map((t) => {
              const Icon =
                t.tone === 'error' ? AlertCircle : t.tone === 'info' ? Info : CheckCircle2;
              return (
                <div
                  key={t.id}
                  role="status"
                  className={cx(
                    'pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur animate-pop-in',
                    t.tone === 'error'
                      ? 'border-cozy-peach bg-cozy-card text-cozy-text'
                      : 'border-cozy-line bg-cozy-card/95 text-cozy-text'
                  )}
                >
                  <Icon
                    size={18}
                    className={cx(
                      'shrink-0',
                      t.tone === 'error'
                        ? 'text-cozy-accent'
                        : t.tone === 'info'
                          ? 'text-cozy-peach'
                          : 'text-cozy-matcha'
                    )}
                  />
                  <span className="flex-1 leading-snug">{t.message}</span>
                  {t.onUndo && (
                    <button
                      type="button"
                      onClick={() => {
                        t.onUndo?.();
                        dismiss(t.id);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-cozy-peach px-2.5 py-1 text-xs font-bold text-[#2A2120] transition hover:brightness-105"
                    >
                      <RotateCcw size={12} /> {t.undoLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Đóng thông báo"
                    className="rounded-lg p-1 text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}

      {/* Hiệu ứng pháo giấy Pastel chúc mừng */}
      {confettiBurst &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[130] flex items-start justify-center overflow-hidden pt-8">
            <div className="flex items-center gap-2 rounded-full border border-cozy-peach bg-cozy-card/95 px-5 py-2.5 text-sm font-bold text-cozy-text shadow-lg animate-pop-in">
              <Sparkles size={17} className="text-cozy-peach" />
              <span>{confettiBurst.text}</span>
            </div>
            <div className="absolute inset-0">
              {Array.from({ length: 22 }).map((_, i) => {
                const colors = ['#F4ACB7', '#A3C9A8', '#E2D4F0', '#FFF3B0', '#FBD3D9'];
                const left = 12 + ((i * 37) % 76);
                const delay = (i % 6) * 0.08;
                return (
                  <span
                    key={i}
                    style={{
                      left: `${left}%`,
                      top: '-12px',
                      backgroundColor: colors[i % colors.length],
                      animation: `cozyFall ${1.8 + (i % 4) * 0.35}s ease-out ${delay}s forwards`,
                      transform: `rotate(${i * 25}deg)`,
                    }}
                    className="absolute h-3 w-2.5 rounded-sm opacity-90"
                  />
                );
              })}
            </div>
            <style>{`
              @keyframes cozyFall {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(85vh) rotate(420deg); opacity: 0; }
              }
            `}</style>
          </div>,
          document.body
        )}

      {/* Hộp thoại Xác nhận mềm mại thay cho window.confirm */}
      <Modal
        open={Boolean(confirmState)}
        onClose={() => closeConfirm(false)}
        title={confirmState?.title || 'Xác nhận'}
        width="max-w-md"
      >
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-cozy-text">{confirmState?.message}</p>
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => closeConfirm(false)}>
              {confirmState?.cancelLabel || 'Hủy'}
            </Button>
            <Button
              variant={confirmState?.danger ? 'danger' : 'primary'}
              onClick={() => closeConfirm(true)}
            >
              {confirmState?.confirmLabel || 'Đồng ý'}
            </Button>
          </div>
        </div>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
      dismiss: () => {},
      confirm: async ({ message }) => window.confirm(message),
      celebrate: () => {},
    };
  }
  return ctx;
}

