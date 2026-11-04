// (1) Lịch & Việc cần làm (Calendar & To-do)
import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ListTodo,
  CalendarDays,
  Trash2,
  Check,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Card, Button, Input, Select, PageHeader, Modal, cx } from '../components/ui.jsx';
import EmptyState from '../components/EmptyState.jsx';
import {
  TodoItem,
  PRIORITIES,
  REPEAT_OPTIONS,
  DEFAULT_CATEGORIES,
  sortTodos,
  applyToggleTodoList,
} from '../components/TodoItem.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { uid, todayISO, toISODate, fromISODate, WEEKDAYS_SHORT, formatLongDate } from '../lib/utils.js';
import { useToast } from '../components/Toast.jsx';
import { usePomodoroState } from '../context/PomodoroContext.jsx';

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: toISODate(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

export default function CalendarTodo() {
  const [todos, setTodos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const { toast, confirm } = useToast();
  const { startFocusOn } = usePomodoroState();

  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [view, setView] = useState('day'); // day | all
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | done
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    title: '',
    priority: 'medium',
    category: DEFAULT_CATEGORIES[0],
    time: '',
    repeat: 'none',
  });

  // Modal tạo danh mục mới (thay thế hoàn toàn window.prompt không chạy trên Electron)
  const [newCatModal, setNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [customCategories, setCustomCategories] = useState([]);

  const categories = useMemo(
    () => [
      ...new Set([
        ...DEFAULT_CATEGORIES,
        ...customCategories,
        ...todos.map((t) => t.category).filter(Boolean),
      ]),
    ],
    [todos, customCategories]
  );

  const byDate = useMemo(() => {
    const map = {};
    todos.forEach((t) => {
      (map[t.date] ||= []).push(t);
    });
    return map;
  }, [todos]);

  const grid = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor]);

  const stats = useMemo(
    () => ({
      total: todos.length,
      done: todos.filter((t) => t.completed).length,
      overdue: todos.filter((t) => !t.completed && t.date < today).length,
    }),
    [todos, today]
  );

  const visible = useMemo(() => {
    let list = view === 'day' ? byDate[selected] || [] : todos;
    if (statusFilter === 'active') list = list.filter((t) => !t.completed);
    if (statusFilter === 'done') list = list.filter((t) => t.completed);
    if (categoryFilter !== 'all') list = list.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return sortTodos(list);
  }, [view, byDate, selected, todos, statusFilter, categoryFilter, search]);

  const moveMonth = (delta) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const goToday = () => {
    const d = new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(today);
  };

  const addTodo = () => {
    const title = form.title.trim();
    if (!title) return;
    if (form.time && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    setTodos((prev) => [
      ...prev,
      {
        id: uid(),
        title,
        date: selected,
        time: form.time || '',
        repeat: form.repeat || 'none',
        priority: form.priority,
        category: form.category,
        completed: false,
        subtasks: [],
      },
    ]);
    setForm((f) => ({ ...f, title: '', time: '', repeat: 'none' }));
  };

  const onCategoryChange = (value) => {
    if (value === '__new__') {
      setNewCatName('');
      setNewCatModal(true);
      return;
    }
    setForm((f) => ({ ...f, category: value }));
  };

  const saveNewCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    setCustomCategories((prev) => [...new Set([...prev, name])]);
    setForm((f) => ({ ...f, category: name }));
    setNewCatModal(false);
  };

  const toggle = (id) => setTodos((prev) => applyToggleTodoList(prev, id));

  const remove = (id) => {
    const removed = todos.find((t) => t.id === id);
    if (!removed) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    toast({
      message: `Đã xóa việc "${removed.title.slice(0, 32)}"`,
      onUndo: () => setTodos((prev) => [...prev, removed]),
    });
  };

  const update = (todo) => setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));

  const handleFocusTodo = (todo) => {
    startFocusOn({ type: 'todo', id: todo.id, title: todo.title });
    toast({ message: `🍅 Đang đếm giờ tập trung cho: "${todo.title}"`, tone: 'info' });
  };

  const clearCompleted = async () => {
    const doneItems = todos.filter((t) => t.completed);
    if (!doneItems.length) return;
    const ok = await confirm({
      title: 'Dọn dẹp việc đã hoàn thành?',
      message: `Xóa ${doneItems.length} việc đã hoàn thành khỏi danh sách? Bạn vẫn có thể bấm Hoàn tác ngay sau khi xóa.`,
      confirmLabel: 'Dọn sạch',
    });
    if (!ok) return;
    setTodos((prev) => prev.filter((t) => !t.completed));
    toast({
      message: `Đã dọn ${doneItems.length} việc đã hoàn thành.`,
      onUndo: () => setTodos((prev) => [...prev, ...doneItems]),
    });
  };

  const selectedDate = fromISODate(selected);

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Lịch & To-do"
        subtitle="Sắp xếp từng ngày thật nhẹ nhàng, có hẹn giờ nhắc việc & chu kỳ lặp lại tự động"
        right={
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-cozy-card px-3 py-1.5 text-cozy-text shadow-sm ring-1 ring-cozy-line">
              Tổng {stats.total}
            </span>
            <span className="rounded-full bg-cozy-matcha/30 px-3 py-1.5 text-cozy-text">Xong {stats.done}</span>
            <span className="rounded-full bg-cozy-peach/25 px-3 py-1.5 text-cozy-text">Quá hạn {stats.overdue}</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[52fr_48fr]">
        {/* LỊCH THÁNG (52%) */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="rounded-xl p-2 text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text"
                title="Tháng trước"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="min-w-[150px] text-center text-lg font-bold text-cozy-text">
                {MONTHS[cursor.m]}, {cursor.y}
              </h2>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="rounded-xl p-2 text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text"
                title="Tháng sau"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Button variant="soft" size="sm" onClick={goToday}>
              Hôm nay
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS_SHORT.map((w, i) => (
              <div key={w} className={cx('pb-2 text-xs font-bold', i >= 5 ? 'text-cozy-accent' : 'text-cozy-muted')}>
                {w}
              </div>
            ))}
            {grid.map((cell) => {
              const list = byDate[cell.iso] || [];
              const pending = list.filter((t) => !t.completed);
              const allDone = list.length > 0 && pending.length === 0;
              const isToday = cell.iso === today;
              const isSelected = cell.iso === selected;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    setSelected(cell.iso);
                    setView('day');
                    if (!cell.inMonth) {
                      const d = fromISODate(cell.iso);
                      setCursor({ y: d.getFullYear(), m: d.getMonth() });
                    }
                  }}
                  className={cx(
                    'relative flex min-h-[46px] flex-col items-center justify-start rounded-2xl border p-1 transition',
                    isSelected
                      ? 'border-cozy-peach bg-cozy-peach/20 shadow-sm'
                      : 'border-transparent hover:border-cozy-line hover:bg-cozy-blush',
                    !cell.inMonth && 'opacity-40'
                  )}
                >
                  <span
                    className={cx(
                      'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                      isToday ? 'bg-cozy-peach text-[#2A2120]' : 'text-cozy-text'
                    )}
                  >
                    {cell.day}
                  </span>
                  {list.length > 0 && (
                    <div className="mt-auto flex items-center gap-0.5 pb-0.5">
                      {allDone ? (
                        <Check size={12} className="text-cozy-matcha" strokeWidth={2.5} />
                      ) : (
                        <>
                          {pending.slice(0, 3).map((t) => (
                            <span key={t.id} className={cx('h-1.5 w-1.5 rounded-full', PRIORITIES[t.priority]?.dot)} />
                          ))}
                          {pending.length > 3 && (
                            <span className="text-[10px] font-bold text-cozy-muted">+{pending.length - 3}</span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-cozy-line pt-3 text-xs text-cozy-muted">
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cx('h-2 w-2 rounded-full', v.dot)} /> Ưu tiên {v.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-cozy-matcha" strokeWidth={2.5} /> Đã xong hết
            </span>
          </div>
        </Card>

        {/* DANH SÁCH VIỆC (48%) */}
        <Card className="flex flex-col p-5">
          <div className="mb-4 flex gap-1 rounded-2xl bg-cozy-blush/70 p-1">
            {[
              { id: 'day', label: 'Ngày đã chọn', icon: CalendarDays },
              { id: 'all', label: 'Tất cả việc', icon: ListTodo },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                className={cx(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition',
                  view === t.id ? 'bg-cozy-card text-cozy-text shadow-sm' : 'text-cozy-muted hover:text-cozy-text'
                )}
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>

          {view === 'day' && (
            <>
              <p className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-cozy-text">
                {selected === today && <Sparkles size={14} className="text-cozy-accent" />}
                <span>
                  {selected === today ? 'Hôm nay · ' : ''}
                  {formatLongDate(selectedDate)}
                </span>
              </p>

              {/* Khung nhập việc phẳng, thanh mảnh, 4 tùy chọn trên 1 hàng */}
              <div
                className="mb-4 space-y-2 pb-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Việc cần làm..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                    className="flex-1 py-2 text-sm"
                  />
                  <Button size="sm" onClick={addTodo} disabled={!form.title.trim()} title="Thêm việc" className="shrink-0 py-2">
                    <Plus size={15} /> Thêm
                  </Button>
                </div>

                {/* Hàng tùy chọn thanh mảnh trên 1 dòng */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <label
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold text-cozy-text transition hover:bg-cozy-blush"
                    style={{ backgroundColor: 'rgba(140, 126, 126, 0.08)' }}
                    title="Mức độ ưu tiên"
                  >
                    <span className={cx('h-2 w-2 shrink-0 rounded-full', PRIORITIES[form.priority]?.dot)} />
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="cursor-pointer bg-transparent font-semibold text-cozy-text outline-none"
                    >
                      {Object.entries(PRIORITIES).map(([k, v]) => (
                        <option key={k} value={k} className="bg-[var(--bg-app)] text-[var(--text-primary)]">
                          Ưu tiên {v.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-cozy-text transition hover:bg-cozy-blush"
                    style={{ backgroundColor: 'rgba(140, 126, 126, 0.08)' }}
                    title="Danh mục công việc"
                  >
                    <Tag size={12} className="shrink-0 text-cozy-muted" />
                    <select
                      value={form.category}
                      onChange={(e) => onCategoryChange(e.target.value)}
                      className="cursor-pointer bg-transparent font-semibold text-cozy-text outline-none"
                    >
                      {[...new Set([...categories, form.category])].map((c) => (
                        <option key={c} value={c} className="bg-[var(--bg-app)] text-[var(--text-primary)]">
                          {c}
                        </option>
                      ))}
                      <option value="__new__" className="bg-[var(--bg-app)] text-[var(--text-primary)]">
                        ＋ Danh mục mới...
                      </option>
                    </select>
                  </label>

                  <label
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-cozy-text transition hover:bg-cozy-blush"
                    style={{ backgroundColor: 'rgba(140, 126, 126, 0.08)' }}
                    title="Giờ nhắc việc (tùy chọn)"
                  >
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-[74px] cursor-pointer bg-transparent text-xs font-semibold text-cozy-text outline-none"
                    />
                  </label>

                  <label
                    className="inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-semibold text-cozy-muted transition hover:bg-cozy-blush hover:text-cozy-text"
                    style={{ backgroundColor: 'rgba(140, 126, 126, 0.08)' }}
                    title="Chu kỳ lặp lại"
                  >
                    <select
                      value={form.repeat}
                      onChange={(e) => setForm({ ...form, repeat: e.target.value })}
                      className="cursor-pointer bg-transparent font-semibold text-cozy-text outline-none"
                    >
                      {Object.entries(REPEAT_OPTIONS).map(([k, label]) => (
                        <option key={k} value={k} className="bg-[var(--bg-app)] text-[var(--text-primary)]">
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </>
          )}

          {view === 'all' && (
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cozy-muted" />
              <Input
                className="pl-9"
                placeholder="Tìm việc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'active', label: 'Chưa xong' },
              { id: 'done', label: 'Đã xong' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={cx(
                  'rounded-full px-3 py-1 text-xs font-bold transition',
                  statusFilter === f.id
                    ? 'bg-cozy-peach text-[#2A2120]'
                    : 'bg-cozy-blush text-cozy-muted hover:text-cozy-text'
                )}
              >
                {f.label}
              </button>
            ))}
            <Select
              className="ml-auto py-1 text-xs"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Mọi danh mục</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="cozy-scroll -mr-1 min-h-[200px] flex-1 overflow-y-auto px-1 xl:max-h-[460px]">
            {visible.length === 0 ? (
              <EmptyState
                title={view === 'day' ? 'Ngày này còn trống' : 'Không tìm thấy việc nào'}
                hint={view === 'day' ? 'Thêm một việc nhỏ cho ngày này nhé' : 'Thử đổi bộ lọc hoặc từ khóa xem sao.'}
                size="w-36"
              />
            ) : (
              <ul>
                {visible.map((t) => (
                  <TodoItem
                    key={t.id}
                    todo={t}
                    onToggle={toggle}
                    onDelete={remove}
                    onUpdate={update}
                    onFocus={handleFocusTodo}
                    showDate={view === 'all'}
                    categories={categories}
                  />
                ))}
              </ul>
            )}
          </div>

          {stats.done > 0 && (
            <div className="mt-3 border-t border-cozy-line pt-3 text-right">
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                <Trash2 size={14} /> Dọn việc đã xong
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Modal tạo danh mục mới */}
      <Modal
        open={newCatModal}
        onClose={() => setNewCatModal(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <Tag size={17} strokeWidth={1.75} className="text-cozy-accent" />
            <span>Thêm danh mục công việc mới</span>
          </span>
        }
        width="max-w-sm"
      >
        <div className="space-y-4">
          <Input
            autoFocus
            placeholder="VD: Tiếng Anh, Dự án nhóm, Gia đình..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveNewCategory()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewCatModal(false)}>
              Hủy
            </Button>
            <Button onClick={saveNewCategory} disabled={!newCatName.trim()}>
              Tạo danh mục
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
