// Bộ component giao diện dùng chung của CozySpace Desktop
import { forwardRef, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Card({ className, children, tone = 'white', ...rest }) {
  return (
    <div
      className={cx(
        'cozy-stationery-card rounded-3xl shadow-sm',
        tone === 'blush' ? 'bg-cozy-blush/80' : '',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

const BTN_VARIANTS = {
  // Chữ màu nâu espresso đậm `#2A2120` trên nền pastel đạt tương phản >5.2:1 chuẩn WCAG AA
  primary:
    'bg-cozy-peach text-[#2A2120] border border-black/5 hover:brightness-[1.03] shadow-sm',
  secondary:
    'bg-cozy-matcha text-[#223026] border border-black/5 hover:brightness-[1.03] shadow-sm',
  soft: 'bg-cozy-blush text-cozy-text border border-cozy-line hover:border-cozy-peach/60 hover:bg-cozy-peach/15',
  ghost: 'text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text',
  lavender: 'bg-cozy-lavender text-cozy-text border border-cozy-line hover:brightness-[1.03]',
  butter: 'bg-cozy-butter text-cozy-text border border-cozy-line hover:brightness-[1.02]',
  danger: 'bg-[#F8D7DA] text-[#6B2128] border border-[#F1AEB5] hover:brightness-95',
};

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all select-none',
        'disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cozy-peach/60',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm',
        BTN_VARIANTS[variant] || BTN_VARIANTS.primary,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({ className, children, title, active, ...rest }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cx(
        'inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cozy-peach/60',
        active ? 'bg-cozy-peach/25 text-cozy-text' : 'text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export const Input = forwardRef(function Input({ className, spellCheck = false, ...rest }, ref) {
  return (
    <input
      ref={ref}
      spellCheck={spellCheck}
      className={cx(
        'w-full rounded-2xl border border-cozy-line bg-cozy-card px-4 py-2.5 text-sm text-cozy-text',
        'placeholder:text-cozy-muted/70 outline-none transition focus:border-cozy-peach focus:ring-4 focus:ring-cozy-peach/15',
        className
      )}
      {...rest}
    />
  );
});

export function Select({ className, children, ...rest }) {
  return (
    <select
      className={cx(
        'rounded-2xl border border-cozy-line bg-cozy-card px-3 py-2.5 text-sm text-cozy-text outline-none',
        'focus:border-cozy-peach focus:ring-4 focus:ring-cozy-peach/15 cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function PageHeader({ icon: Icon, emoji, title, subtitle, right }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-cozy-text">
          {Icon ? (
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--accent)',
              }}
            >
              <Icon size={20} strokeWidth={1.75} />
            </span>
          ) : emoji ? (
            <span className="mr-1">{emoji}</span>
          ) : null}
          <span>{title}</span>
        </h1>
        {subtitle && <p className="mt-1 text-sm text-cozy-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// Ngăn xếp modal: phím Esc chỉ đóng modal nằm trên cùng & khôi phục focus khi đóng
const modalStack = [];

export function Modal({ open, onClose, title, children, width = 'max-w-lg', footer }) {
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    const token = {};
    modalStack.push(token);
    const onKey = (e) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === token) {
        e.stopPropagation();
        closeRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const idx = modalStack.indexOf(token);
      if (idx !== -1) modalStack.splice(idx, 1);
      if (prevFocus && typeof prevFocus.focus === 'function') {
        try {
          prevFocus.focus();
        } catch {
          /* ignore */
        }
      }
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'relative flex max-h-[90vh] w-full flex-col rounded-3xl border border-cozy-line bg-cozy-bg shadow-xl animate-pop-in',
          width
        )}
      >
        <div className="flex items-center justify-between border-b border-cozy-line px-6 py-4">
          <h2 id={titleId} className="text-lg font-bold text-cozy-text">
            {title}
          </h2>
          <IconButton title="Đóng" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="cozy-scroll flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-cozy-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
