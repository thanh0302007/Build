// (0) Trang chủ Dashboard
import { useMemo, useState } from 'react';
import { Plus, ArrowRight, Pin, Timer, CheckCircle2, StickyNote, Wallet, Play, Pause } from 'lucide-react';
import { Card, Button, Input } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { TodoItem, sortTodos } from '../components/TodoItem.jsx';
import { DashboardBannerSvg, MascotFocusSvg, MascotBreakSvg } from '../assets/defaultSvgs.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { uid, todayISO, formatLongDate, getGreeting, formatRelativeTime } from '../lib/utils.js';
import { usePomodoro, formatClock, MODE_META } from '../context/PomodoroContext.jsx';
import { NOTE_COLORS } from './QuickNotes.jsx';

const QUOTES = [
  'Từng bước nhỏ mỗi ngày sẽ đưa bạn đến những nơi thật xa 🌱',
  'Hãy tử tế với bản thân, bạn đang làm tốt hơn bạn nghĩ đấy 💗',
  'Một tách trà, một trang sách, một ngày thật dịu dàng 🍵',
  'Không cần vội, chỉ cần đừng dừng lại ✨',
  'Hôm nay học một chút, mai sẽ hiểu thêm nhiều chút 📚',
  'Nghỉ ngơi cũng là một phần của sự tiến bộ 🌙',
  'Bạn nhỏ ơi, cố lên nhé! Mọi nỗ lực đều đáng giá 🌸',
];

function StatCard({ icon: Icon, tint, label, value, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="flex h-full items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
          <Icon size={22} className="text-cozy-text" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-cozy-muted">{label}</p>
          <p className="truncate text-xl font-bold text-cozy-text">{value}</p>
          {sub && <p className="truncate text-[11px] text-cozy-muted">{sub}</p>}
        </div>
      </Card>
    </button>
  );
}

export default function Dashboard({ onNavigate }) {
  const [todos, setTodos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const [notes] = useCozyStorage(STORAGE_KEYS.STICKY_NOTES);
  const [expenses] = useCozyStorage(STORAGE_KEYS.EXPENSES);
  const pomo = usePomodoro();
  const [quickTitle, setQuickTitle] = useState('');

  const today = todayISO();
  const now = new Date();
  const greeting = getGreeting(now);
  const quote = QUOTES[(now.getDate() + now.getMonth()) % QUOTES.length];

  const todayTodos = useMemo(
    () => sortTodos(todos.filter((t) => t.date === today || (!t.completed && t.date < today))),
    [todos, today]
  );
  const doneToday = todos.filter((t) => t.date === today && t.completed).length;
  const totalToday = todos.filter((t) => t.date === today).length;
  const pinnedNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt - a.updatedAt)
        .slice(0, 4),
    [notes]
  );

  const monthKey = today.slice(0, 7);
  const monthExpense = (expenses.transactions || [])
    .filter((t) => t.type === 'expense' && t.date?.startsWith(monthKey))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const addQuick = () => {
    const title = quickTitle.trim();
    if (!title) return;
    setTodos((prev) => [
      ...prev,
      { id: uid(), title, date: today, priority: 'medium', category: 'Cá nhân', completed: false },
    ]);
    setQuickTitle('');
  };

  const toggle = (id) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const remove = (id) => setTodos((prev) => prev.filter((t) => t.id !== id));

  const progress = totalToday ? Math.round((doneToday / totalToday) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Card className="relative h-56 overflow-hidden p-0">
        <ImageSlot
          slotId="dashboard_banner"
          defaultSvg={<DashboardBannerSvg />}
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-[#FDFBF7]/95 via-[#FDFBF7]/70 to-transparent" />
        <div className="pointer-events-none relative flex h-full max-w-lg flex-col justify-center px-8">
          <p className="text-sm font-semibold text-cozy-muted">{formatLongDate(now)}</p>
          <h1 className="mt-1 text-3xl font-bold text-cozy-text">
            {greeting.text} {greeting.emoji}
          </h1>
          <p className="mt-2 text-sm text-cozy-text/80">{quote}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-white/80">
              <div className="h-full rounded-full bg-cozy-matcha transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-semibold text-cozy-muted">
              {totalToday ? `${doneToday}/${totalToday} việc hôm nay` : 'Hôm nay chưa có việc nào'}
            </span>
          </div>
        </div>
      </Card>

      {/* Thống kê */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          tint="bg-cozy-matcha/30"
          label="Việc hôm nay"
          value={`${doneToday}/${totalToday}`}
          sub={`${todayTodos.filter((t) => !t.completed).length} việc đang chờ`}
          onClick={() => onNavigate('calendar')}
        />
        <StatCard
          icon={Timer}
          tint="bg-cozy-peach/25"
          label="Phiên Pomodoro"
          value={`${pomo.config.completedSessions || 0} phiên`}
          sub={`≈ ${Math.round(((pomo.config.completedSessions || 0) * (pomo.config.pomodoroWork || 25)) / 60 * 10) / 10} giờ tập trung`}
          onClick={() => onNavigate('focus')}
        />
        <StatCard
          icon={StickyNote}
          tint="bg-cozy-butter"
          label="Ghi chú nhanh"
          value={`${notes.length} ghi chú`}
          sub={`${notes.filter((n) => n.isPinned).length} đã ghim`}
          onClick={() => onNavigate('notes')}
        />
        <StatCard
          icon={Wallet}
          tint="bg-cozy-lavender"
          label="Chi tiêu tháng này"
          value={`${monthExpense.toLocaleString('vi-VN')}₫`}
          sub={expenses.monthlyBudget ? `Ngân sách ${Number(expenses.monthlyBudget).toLocaleString('vi-VN')}₫` : 'Chưa đặt ngân sách'}
          onClick={() => onNavigate('expenses')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Việc cần làm hôm nay */}
        <Card className="p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-cozy-text">📝 Việc cần làm hôm nay</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('calendar')}>
              Xem lịch <ArrowRight size={14} />
            </Button>
          </div>
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Thêm nhanh một việc cho hôm nay..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addQuick()}
            />
            <Button onClick={addQuick} disabled={!quickTitle.trim()}>
              <Plus size={16} /> Thêm
            </Button>
          </div>
          {todayTodos.length === 0 ? (
            <EmptyState title="Hôm nay thật thảnh thơi" hint="Thêm một việc nhỏ để bắt đầu ngày mới thật năng suất nhé!" size="w-36" />
          ) : (
            <ul className="cozy-scroll max-h-80 space-y-2 overflow-y-auto pr-1">
              {todayTodos.map((t) => (
                <TodoItem key={t.id} todo={t} onToggle={toggle} onDelete={remove} showDate={t.date !== today} />
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6 xl:col-span-2">
          {/* Góc tập trung */}
          <Card tone="blush" className="flex items-center gap-4 p-5">
            <ImageSlot
              key={pomo.isBreak ? 'break' : 'focus'}
              slotId={pomo.isBreak ? 'mascot_break' : 'mascot_focus'}
              defaultSvg={pomo.isBreak ? <MascotBreakSvg /> : <MascotFocusSvg />}
              fit="contain"
              compact
              className="h-28 w-28 shrink-0 rounded-2xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-cozy-muted">
                {MODE_META[pomo.mode].emoji} {MODE_META[pomo.mode].label}
              </p>
              <p className="text-4xl font-bold tabular-nums text-cozy-text">{formatClock(pomo.remainingMs)}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={pomo.status === 'running' ? pomo.pause : pomo.start}>
                  {pomo.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                  {pomo.status === 'running' ? 'Tạm dừng' : pomo.status === 'paused' ? 'Tiếp tục' : 'Bắt đầu'}
                </Button>
                <Button size="sm" variant="soft" onClick={() => onNavigate('focus')}>
                  Mở Góc tập trung
                </Button>
              </div>
            </div>
          </Card>

          {/* Ghi chú */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-cozy-text">📌 Ghi chú gần đây</h2>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('notes')}>
                Tất cả <ArrowRight size={14} />
              </Button>
            </div>
            {pinnedNotes.length === 0 ? (
              <EmptyState title="Chưa có ghi chú" hint="Ghi lại ý tưởng chợt đến ở mục Ghi chú nhanh." size="w-28" className="py-4" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {pinnedNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onNavigate('notes')}
                    className="relative min-h-[88px] rounded-2xl border border-cozy-line p-3 text-left text-xs text-cozy-text shadow-sm transition hover:-rotate-1"
                    style={{ backgroundColor: NOTE_COLORS.find((c) => c.id === n.color)?.bg || n.color || '#FFF3B0' }}
                  >
                    {n.isPinned && <Pin size={12} className="absolute right-2 top-2 fill-cozy-peach text-cozy-peach" />}
                    <p className="line-clamp-3 whitespace-pre-wrap pr-3">{n.content || <i className="text-cozy-muted">(trống)</i>}</p>
                    <p className="mt-2 text-[10px] text-cozy-muted">{formatRelativeTime(n.updatedAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

