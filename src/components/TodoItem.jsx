// Thành phần hiển thị & chỉnh sửa Việc cần làm (dùng chung cho Dashboard & Lịch)
import { useState } from 'react';
import {
  Check,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Clock,
  Repeat,
  Timer,
  Plus,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { formatShortDate, nextRepeatDateISO, playTickSound, todayISO, uid } from '../lib/utils.js';
import { cx, IconButton, Input, Select } from './ui.jsx';

export const PRIORITIES = {
  high: { label: 'Cao', dot: 'bg-cozy-peach', order: 0 },
  medium: { label: 'Vừa', dot: 'bg-cozy-butter border border-cozy-line', order: 1 },
  low: { label: 'Thấp', dot: 'bg-cozy-matcha', order: 2 },
};

export const REPEAT_OPTIONS = {
  none: 'Không lặp',
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  monthly: 'Hằng tháng',
};

export const DEFAULT_CATEGORIES = ['Học tập', 'Cá nhân', 'Công việc', 'Sức khỏe', 'Khác'];

/** Sắp xếp: chưa xong trước -> ưu tiên -> ngày -> giờ */
export const sortTodos = (list) =>
  [...list].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      (PRIORITIES[a.priority]?.order ?? 1) - (PRIORITIES[b.priority]?.order ?? 1) ||
      (a.date || '').localeCompare(b.date || '') ||
      (a.time || '99:99').localeCompare(b.time || '99:99')
  );

/** Đánh dấu hoàn thành kèm tự sinh kỳ tiếp theo nếu việc có lặp lại */
export function applyToggleTodoList(prevList, id) {
  let spawned = null;
  let becameDone = false;

  const updated = prevList.map((t) => {
    if (t.id !== id) return t;
    const nextCompleted = !t.completed;
    becameDone = nextCompleted;
    if (nextCompleted && t.repeat && t.repeat !== 'none') {
      const nextDate = nextRepeatDateISO(t.date, t.repeat);
      const alreadyExists =
        nextDate &&
        prevList.some((other) => other.id !== t.id && !other.completed && other.title === t.title && other.date === nextDate);
      if (nextDate && !alreadyExists) {
        spawned = {
          ...t,
          id: uid(),
          date: nextDate,
          completed: false,
          subtasks: Array.isArray(t.subtasks) ? t.subtasks.map((s) => ({ ...s, done: false })) : [],
        };
      }
    }
    return { ...t, completed: nextCompleted };
  });

  if (becameDone) {
    playTickSound();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cozy-companion-celebrate', {
          detail: { type: 'todo', message: 'Giỏi quá! Đã xong thêm 1 việc rồi!' },
        })
      );
    }
  }
  return spawned ? [...updated, spawned] : updated;
}

export function CheckCircle({ checked, onChange, title = 'Đánh dấu hoàn thành', size = 'md' }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={checked}
      onClick={onChange}
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full border-2 transition-all',
        size === 'sm' ? 'h-4 w-4' : 'h-6 w-6',
        checked
          ? 'border-cozy-matcha bg-cozy-matcha text-[#223026]'
          : 'border-cozy-peach/80 bg-cozy-card hover:bg-cozy-blush'
      )}
    >
      {checked && <Check size={size === 'sm' ? 10 : 14} strokeWidth={3} />}
    </button>
  );
}

export function TodoItem({
  todo,
  onToggle,
  onDelete,
  onUpdate,
  onFocus,
  showDate = false,
  categories = DEFAULT_CATEGORIES,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo);
  const [subInput, setSubInput] = useState('');

  const today = todayISO();
  const overdue = !todo.completed && todo.date < today;
  const p = PRIORITIES[todo.priority] || PRIORITIES.medium;
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];

  const toggleSubtask = (subId) => {
    if (!onUpdate) return;
    const nextSubs = subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
    onUpdate({ ...todo, subtasks: nextSubs });
  };

  if (editing && onUpdate) {
    const draftSubs = Array.isArray(draft.subtasks) ? draft.subtasks : [];
    const addDraftSub = () => {
      const txt = subInput.trim();
      if (!txt) return;
      setDraft({ ...draft, subtasks: [...draftSubs, { id: uid(), title: txt, done: false }] });
      setSubInput('');
    };
    const save = () => {
      if (!draft.title.trim()) return;
      onUpdate({ ...draft, title: draft.title.trim() });
      setEditing(false);
    };

    return (
      <li
        className="space-y-2.5 rounded-xl bg-cozy-blush/50 p-3 animate-pop-in"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
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
          <Input
            type="date"
            className="w-auto py-1 text-xs"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
          <Input
            type="time"
            className="w-auto py-1 text-xs"
            value={draft.time || ''}
            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            title="Giờ nhắc việc (tùy chọn)"
          />
          <Select
            className="py-1 text-xs"
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
          >
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>
                Ưu tiên {v.label}
              </option>
            ))}
          </Select>
          <Select
            className="py-1 text-xs"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            {[...new Set([...categories, draft.category])].filter(Boolean).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            className="py-1 text-xs"
            value={draft.repeat || 'none'}
            onChange={(e) => setDraft({ ...draft, repeat: e.target.value })}
          >
            {Object.entries(REPEAT_OPTIONS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {/* Việc con (Subtasks) */}
        <div className="space-y-1.5 pt-1">
          {draftSubs.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-cozy-text">• {s.title}</span>
              <button
                type="button"
                onClick={() =>
                  setDraft({ ...draft, subtasks: draftSubs.filter((x) => x.id !== s.id) })
                }
                className="text-cozy-muted hover:text-cozy-accent"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <Input
              placeholder="Thêm bước nhỏ (subtask)..."
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDraftSub();
                }
              }}
              className="py-1 text-xs"
            />
            <IconButton title="Thêm bước nhỏ" onClick={addDraftSub} className="bg-cozy-blush">
              <Plus size={14} />
            </IconButton>
          </div>
        </div>

        <div className="flex justify-end gap-1.5">
          <IconButton title="Hủy" onClick={() => setEditing(false)}>
            <X size={16} />
          </IconButton>
          <IconButton title="Lưu thay đổi" onClick={save} className="bg-cozy-matcha/35 text-cozy-text">
            <Check size={16} />
          </IconButton>
        </div>
      </li>
    );
  }

  return (
    <li
      className={cx(
        'group py-2.5 transition-colors hover:bg-cozy-blush/35 px-2 -mx-2 rounded-xl',
        todo.completed && 'opacity-55'
      )}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex items-center gap-2">
          <CheckCircle size="sm" checked={todo.completed} onChange={() => onToggle(todo.id)} />
          <span
            className={cx('h-1.5 w-1.5 shrink-0 rounded-full', p.dot)}
            title={`Ưu tiên ${p.label}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p
              className={cx(
                'break-words text-sm font-medium leading-snug text-cozy-text',
                todo.completed && 'line-through decoration-cozy-peach/80'
              )}
            >
              {todo.title}
            </p>

            {/* Metadata chữ thuần màu xám dịu (--text-muted), không dùng pill badges màu mè */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
              {todo.category && <span>{todo.category}</span>}
              {todo.time && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  {todo.category && <span>·</span>}
                  <Clock size={10} /> {todo.time}
                </span>
              )}
              {todo.repeat && todo.repeat !== 'none' && (
                <span className="inline-flex items-center gap-1">
                  <span>·</span>
                  <Repeat size={10} /> {REPEAT_OPTIONS[todo.repeat]}
                </span>
              )}
              {subtasks.length > 0 && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <span>·</span>
                  <ListChecks size={11} /> {subtasks.filter((s) => s.done).length}/{subtasks.length}
                </span>
              )}
              {(showDate || overdue) && (
                <span className={cx('inline-flex items-center gap-1 tabular-nums', overdue && 'font-semibold text-cozy-accent')}>
                  <span>·</span>
                  <CalendarDays size={10} /> {formatShortDate(todo.date)}
                  {overdue && ' (quá hạn)'}
                </span>
              )}
              {overdue && onUpdate && (
                <button
                  type="button"
                  onClick={() => onUpdate({ ...todo, date: today })}
                  className="inline-flex items-center gap-0.5 font-semibold text-cozy-accent hover:underline"
                  title="Dời việc này sang hôm nay"
                >
                  <ArrowRight size={10} /> Hôm nay
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          {!todo.completed && onFocus && (
            <IconButton
              title="Bắt đầu tập trung Pomodoro cho việc này"
              onClick={() => onFocus(todo)}
              className="h-7 w-7 text-cozy-accent"
            >
              <Timer size={14} />
            </IconButton>
          )}
          {onUpdate && (
            <IconButton
              title="Chỉnh sửa"
              onClick={() => {
                setDraft(todo);
                setEditing(true);
              }}
              className="h-7 w-7"
            >
              <Pencil size={13} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton title="Xóa" onClick={() => onDelete(todo.id)} className="h-7 w-7">
              <Trash2 size={13} />
            </IconButton>
          )}
        </div>
      </div>

      {/* Hiển thị các bước nhỏ (subtasks) dạng dòng phẳng */}
      {subtasks.length > 0 && !todo.completed && (
        <ul
          className="mt-1.5 ml-8 space-y-1 pl-3"
          style={{ borderLeft: '1px solid var(--border-subtle)' }}
        >
          {subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs text-cozy-text">
              <CheckCircle
                size="sm"
                checked={Boolean(s.done)}
                onChange={() => toggleSubtask(s.id)}
                title="Hoàn thành bước nhỏ"
              />
              <span className={cx('break-words', s.done && 'line-through text-cozy-muted')}>
                {s.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
