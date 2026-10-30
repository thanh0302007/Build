// Bộ component giao diện dùng chung theo phong cách Cozy Pastel
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Card({ className, children, tone = 'white', ...rest }) {
  return (
    <div
      className={cx(
        'rounded-3xl border border-cozy-line shadow-sm',
        tone === 'blush' ? 'bg-cozy-blush' : 'bg-cozy-card',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

const BTN_VARIANTS = {
  primary: 'bg-cozy-peach text-white hover:brightness-105 shadow-sm',
  secondary: 'bg-cozy-matcha text-white hover:brightness-105 shadow-sm',
  soft: 'bg-cozy-blush text-cozy-text border border-cozy-line hover:bg-[#FCEFF1]',
  ghost: 'text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text',
  lavender: 'bg-cozy-lavender text-cozy-text hover:brightness-[1.03]',
  butter: 'bg-cozy-butter text-cozy-text hover:brightness-[1.02]',
};

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm',
        BTN_VARIANTS[variant],
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
        active ? 'bg-cozy-peach/20 text-cozy-text' : 'text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...rest }) {
  return (
    <input
      className={cx(
        'w-full rounded-2xl border border-cozy-line bg-white px-4 py-2.5 text-sm text-cozy-text',
        'placeholder:text-cozy-muted/70 outline-none transition focus:border-cozy-peach focus:ring-4 focus:ring-cozy-peach/15',
        className
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }) {
  return (
    <select
      className={cx(
        'rounded-2xl border border-cozy-line bg-white px-3 py-2.5 text-sm text-cozy-text outline-none',
        'focus:border-cozy-peach focus:ring-4 focus:ring-cozy-peach/15 cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function PageHeader({ emoji, title, subtitle, right }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-cozy-text">
          {emoji && <span className="mr-2">{emoji}</span>}
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-cozy-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// Ngăn xếp modal: phím Esc chỉ đóng modal nằm trên cùng
const modalStack = [];

export function Modal({ open, onClose, title, children, width = 'max-w-lg', footer }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    modalStack.push(token);
    const onKey = (e) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === token) closeRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      modalStack.splice(modalStack.indexOf(token), 1);
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#4A4A4A]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative flex max-h-[90vh] w-full flex-col rounded-3xl border border-cozy-line bg-cozy-bg shadow-xl animate-pop-in',
          width
        )}
      >
        <div className="flex items-center justify-between border-b border-cozy-line px-6 py-4">
          <h2 className="text-lg font-bold text-cozy-text">{title}</h2>
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
