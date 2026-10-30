// (1) Lịch & To-do
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, ListTodo, CalendarDays, Trash2 } from 'lucide-react';
import { Card, Button, Input, Select, PageHeader, cx } from '../components/ui.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { TodoItem, PRIORITIES, DEFAULT_CATEGORIES, sortTodos } from '../components/TodoItem.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { uid, todayISO, toISODate, fromISODate, WEEKDAYS_SHORT, formatLongDate } from '../lib/utils.js';

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

/** 42 ô lịch (6 tuần), tuần bắt đầu từ Thứ 2 */
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

  const [form, setForm] = useState({ title: '', priority: 'medium', category: DEFAULT_CATEGORIES[0] });

  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...todos.map((t) => t.category).filter(Boolean)])],
    [todos]
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
    setTodos((prev) => [
      ...prev,
      { id: uid(), title, date: selected, priority: form.priority, category: form.category, completed: false },
    ]);
    setForm((f) => ({ ...f, title: '' }));
  };

  const onCategoryChange = (value) => {
    if (value === '__new__') {
      const name = window.prompt('Tên danh mục mới:');
      if (name && name.trim()) setForm((f) => ({ ...f, category: name.trim() }));
      return;
    }
    setForm((f) => ({ ...f, category: value }));
  };

  const toggle = (id) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const remove = (id) => setTodos((prev) => prev.filter((t) => t.id !== id));
  const update = (todo) => setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));
  const clearCompleted = () => {
    if (window.confirm('Xóa tất cả việc đã hoàn thành?')) setTodos((prev) => prev.filter((t) => !t.completed));
  };

  const selectedDate = fromISODate(selected);

  return (
    <div>
      <PageHeader
        emoji="📅"
        title="Lịch & To-do"
        subtitle="Sắp xếp từng ngày thật nhẹ nhàng, mỗi việc nhỏ hoàn thành là một niềm vui"
        right={
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white px-3 py-1.5 text-cozy-text shadow-sm ring-1 ring-cozy-line">Tổng {stats.total}</span>
            <span className="rounded-full bg-cozy-matcha/25 px-3 py-1.5 text-cozy-text">Xong {stats.done}</span>
            <span className="rounded-full bg-cozy-peach/25 px-3 py-1.5 text-cozy-text">Quá hạn {stats.overdue}</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* LỊCH THÁNG */}
        <Card className="p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => moveMonth(-1)} className="rounded-xl p-2 text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text" title="Tháng trước">
                <ChevronLeft size={18} />
              </button>
              <h2 className="min-w-[150px] text-center text-lg font-bold text-cozy-text">
                {MONTHS[cursor.m]}, {cursor.y}
              </h2>
              <button type="button" onClick={() => moveMonth(1)} className="rounded-xl p-2 text-cozy-muted hover:bg-cozy-blush hover:text-cozy-text" title="Tháng sau">
                <ChevronRight size={18} />
              </button>
            </div>
            <Button variant="soft" size="sm" onClick={goToday}>
              Hôm nay
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS_SHORT.map((w, i) => (
              <div key={w} className={cx('pb-2 text-xs font-bold', i >= 5 ? 'text-cozy-peach' : 'text-cozy-muted')}>
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
                    'relative flex aspect-square min-h-[52px] flex-col items-center justify-start rounded-2xl border p-1.5 transition',
                    isSelected ? 'border-cozy-peach bg-cozy-peach/15 shadow-sm' : 'border-transparent hover:border-cozy-line hover:bg-cozy-blush',
                    !cell.inMonth && 'opacity-40'
                  )}
                >
                  <span
                    className={cx(
                      'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                      isToday ? 'bg-cozy-peach text-white' : 'text-cozy-text'
                    )}
                  >
                    {cell.day}
                  </span>
                  {list.length > 0 && (
                    <div className="mt-auto flex items-center gap-0.5 pb-0.5">
                      {allDone ? (
                        <span className="text-[10px]">✅</span>
                      ) : (
                        <>
                          {pending.slice(0, 3).map((t) => (
                            <span key={t.id} className={cx('h-1.5 w-1.5 rounded-full', PRIORITIES[t.priority]?.dot)} />
                          ))}
                          {pending.length > 3 && <span className="text-[9px] font-bold text-cozy-muted">+{pending.length - 3}</span>}
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
            <span className="flex items-center gap-1.5">✅ Đã xong hết</span>
          </div>
        </Card>

        {/* DANH SÁCH VIỆC */}
        <Card className="flex flex-col p-5 xl:col-span-2">
          <div className="mb-4 flex gap-1 rounded-2xl bg-cozy-blush p-1">
            {[
              { id: 'day', label: 'Ngày đã chọn', icon: CalendarDays },
              { id: 'all', label: 'Tất cả việc', icon: ListTodo },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                className={cx(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition',
                  view === t.id ? 'bg-white text-cozy-text shadow-sm' : 'text-cozy-muted hover:text-cozy-text'
                )}
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>

          {view === 'day' && (
            <>
              <p className="mb-3 text-sm font-bold text-cozy-text">
                {selected === today ? '🌟 Hôm nay · ' : ''}
                {formatLongDate(selectedDate)}
              </p>
              <div className="mb-4 space-y-2 rounded-2xl border border-cozy-line bg-cozy-bg p-3">
                <Input
                  placeholder="Việc cần làm..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                />
                <div className="flex gap-2">
                  <Select className="flex-1" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {Object.entries(PRIORITIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        Ưu tiên {v.label}
                      </option>
                    ))}
                  </Select>
                  <Select className="flex-1" value={form.category} onChange={(e) => onCategoryChange(e.target.value)}>
                    {[...new Set([...categories, form.category])].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__new__">＋ Danh mục mới...</option>
                  </Select>
                  <Button onClick={addTodo} disabled={!form.title.trim()} title="Thêm việc">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}

          {view === 'all' && (
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cozy-muted" />
              <Input className="pl-9" placeholder="Tìm việc..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  statusFilter === f.id ? 'bg-cozy-peach text-white' : 'bg-cozy-blush text-cozy-muted hover:text-cozy-text'
                )}
              >
                {f.label}
              </button>
            ))}
            <Select className="ml-auto py-1 text-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Mọi danh mục</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="cozy-scroll -mr-1 min-h-[200px] flex-1 overflow-y-auto pr-1 xl:max-h-[440px]">
            {visible.length === 0 ? (
              <EmptyState
                title={view === 'day' ? 'Ngày này còn trống' : 'Không tìm thấy việc nào'}
                hint={view === 'day' ? 'Thêm một việc nhỏ cho ngày này nhé ✨' : 'Thử đổi bộ lọc hoặc từ khóa xem sao.'}
                size="w-36"
              />
            ) : (
              <ul className="space-y-2">
                {visible.map((t) => (
                  <TodoItem
                    key={t.id}
                    todo={t}
                    onToggle={toggle}
                    onDelete={remove}
                    onUpdate={update}
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
    </div>
  );
}

