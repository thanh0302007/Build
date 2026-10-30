// Thành phần dùng chung cho cozy_todos (Dashboard & Lịch)
import { useState } from 'react';
import { Check, Pencil, Trash2, X, CalendarDays } from 'lucide-react';
import { formatShortDate, todayISO } from '../lib/utils.js';
import { cx, IconButton, Input, Select } from './ui.jsx';

export const PRIORITIES = {
  high: { label: 'Cao', dot: 'bg-cozy-peach', chip: 'bg-cozy-peach/25 text-cozy-text', order: 0 },
  medium: { label: 'Vừa', dot: 'bg-cozy-butter border border-[#E9DCCB]', chip: 'bg-cozy-butter text-cozy-text', order: 1 },
  low: { label: 'Thấp', dot: 'bg-cozy-matcha', chip: 'bg-cozy-matcha/25 text-cozy-text', order: 2 },
};

export const DEFAULT_CATEGORIES = ['Học tập', 'Cá nhân', 'Công việc', 'Sức khỏe', 'Khác'];

/** Sắp xếp: chưa xong trước, theo ưu tiên, rồi theo ngày */
export const sortTodos = (list) =>
  [...list].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      (PRIORITIES[a.priority]?.order ?? 1) - (PRIORITIES[b.priority]?.order ?? 1) ||
      a.date.localeCompare(b.date)
  );

export function CheckCircle({ checked, onChange, title = 'Đánh dấu hoàn thành' }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={checked}
      onClick={onChange}
      className={cx(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
        checked ? 'border-cozy-matcha bg-cozy-matcha text-white' : 'border-cozy-peach/70 bg-white hover:bg-cozy-blush'
      )}
    >
      {checked && <Check size={14} strokeWidth={3} />}
    </button>
  );
}

export function TodoItem({ todo, onToggle, onDelete, onUpdate, showDate = false, categories = DEFAULT_CATEGORIES }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo);
  const overdue = !todo.completed && todo.date < todayISO();
  const p = PRIORITIES[todo.priority] || PRIORITIES.medium;

  if (editing && onUpdate) {
    const save = () => {
      if (!draft.title.trim()) return;
      onUpdate({ ...draft, title: draft.title.trim() });
      setEditing(false);
    };
    return (
      <li className="space-y-2 rounded-2xl border border-cozy-peach/50 bg-cozy-blush p-3">
        <Input
          autoFocus
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" className="w-auto" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <Select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>
                Ưu tiên {v.label}
              </option>
            ))}
          </Select>
          <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {[...new Set([...categories, draft.category])].filter(Boolean).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <div className="ml-auto flex gap-1">
            <IconButton title="Lưu" onClick={save} className="bg-cozy-matcha/20">
              <Check size={16} />
            </IconButton>
            <IconButton title="Hủy" onClick={() => setEditing(false)}>
              <X size={16} />
            </IconButton>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      className={cx(
        'group flex items-center gap-3 rounded-2xl border border-cozy-line bg-white px-3 py-2.5 transition hover:shadow-sm',
        todo.completed && 'opacity-60'
      )}
    >
      <CheckCircle checked={todo.completed} onChange={() => onToggle(todo.id)} />
      <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', p.dot)} title={`Ưu tiên ${p.label}`} />
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-sm font-semibold text-cozy-text', todo.completed && 'line-through decoration-cozy-peach/70')}>
          {todo.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-cozy-muted">
          {todo.category && <span className="rounded-full bg-cozy-lavender/60 px-2 py-0.5">{todo.category}</span>}
          {showDate && (
            <span className={cx('inline-flex items-center gap-1', overdue && 'font-semibold text-cozy-peach')}>
              <CalendarDays size={11} /> {formatShortDate(todo.date)}
              {overdue && ' · quá hạn'}
            </span>
          )}
          {!showDate && overdue && <span className="font-semibold text-cozy-peach">quá hạn</span>}
        </div>
      </div>
      <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
        {onUpdate && (
          <IconButton
            title="Sửa"
            onClick={() => {
              setDraft(todo);
              setEditing(true);
            }}
          >
            <Pencil size={14} />
          </IconButton>
        )}
        {onDelete && (
          <IconButton title="Xóa" onClick={() => onDelete(todo.id)}>
            <Trash2 size={14} />
          </IconButton>
        )}
      </div>
    </li>
  );
}

