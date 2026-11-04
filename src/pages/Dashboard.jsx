// (0) Trang chủ Dashboard — Tổng quan nhịp sống mỗi ngày
import { useMemo, useState } from 'react';
import {
  Plus,
  ArrowRight,
  Pin,
  Timer,
  CheckCircle2,
  StickyNote,
  Wallet,
  Play,
  Pause,
  Flame,
  Sparkles,
  Sunrise,
  ListTodo,
  BarChart3,
  Heart,
  Target,
} from 'lucide-react';
import { Card, Button, Input, cx } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import EmptyState from '../components/EmptyState.jsx';
import {
  TodoItem,
  sortTodos,
  applyToggleTodoList,
  DEFAULT_CATEGORIES,
} from '../components/TodoItem.jsx';
import { DashboardBannerSvg } from '../assets/defaultSvgs.jsx';
import LivingCompanion from '../components/LivingCompanion.jsx';
import { MOOD_SUB_SLOTS } from '../lib/imageSlots.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import {
  uid,
  todayISO,
  addDaysISO,
  formatLongDate,
  formatShortDate,
  getGreeting,
  formatRelativeTime,
} from '../lib/utils.js';
import {
  usePomodoroState,
  usePomodoroClock,
  formatClock,
  MODE_META,
} from '../context/PomodoroContext.jsx';
import { NOTE_COLORS } from './QuickNotes.jsx';
import { useToast } from '../components/Toast.jsx';

const QUOTES = [
  'Từng bước nhỏ mỗi ngày sẽ đưa bạn đến những nơi thật xa',
  'Hãy tử tế với bản thân, bạn đang làm tốt hơn bạn nghĩ đấy',
  'Một tách trà, một trang sách, một ngày thật dịu dàng',
  'Không cần vội, chỉ cần đừng dừng lại',
  'Hôm nay học một chút, mai sẽ hiểu thêm nhiều chút',
  'Nghỉ ngơi cũng là một phần của sự tiến bộ',
  'Bạn nhỏ ơi, cố lên nhé! Mọi nỗ lực đều đáng giá',
];

function StatusStripItem({ icon: Icon, label, value, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-max items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-cozy-blush/50"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105"
        style={{
          backgroundColor: 'rgba(140, 126, 126, 0.1)',
          color: 'var(--accent)',
        }}
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-max">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
          <span className="text-sm font-bold tabular-nums text-cozy-text">{value}</span>
        </div>
        {sub && <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>}
      </div>
    </button>
  );
}

/** Tách riêng thẻ đồng hồ để không làm cả Dashboard vẽ lại mỗi giây */
function DashboardFocusCard({ onNavigate }) {
  const pomo = usePomodoroState();
  const { remainingMs } = usePomodoroClock();

  return (
    <Card tone="blush" className="flex items-center gap-4 p-5">
      <LivingCompanion
        isFocusing={pomo.status === 'running' && !pomo.isBreak}
        isBreak={pomo.isBreak}
        size="sm"
        className="h-28 w-28 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
          <Timer size={13} strokeWidth={1.75} className="text-cozy-accent" />
          <span>{MODE_META[pomo.mode].label}</span>
        </p>
        <p className="text-4xl font-bold tabular-nums text-cozy-text">{formatClock(remainingMs)}</p>
        {pomo.focusTarget && (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-cozy-accent">
            <Target size={12} className="shrink-0" />
            <span className="break-words">{pomo.focusTarget.title}</span>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={pomo.status === 'running' ? pomo.pause : pomo.start}>
            {pomo.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
            {pomo.status === 'running' ? 'Tạm dừng' : pomo.status === 'paused' ? 'Tiếp tục' : 'Bắt đầu'}
          </Button>
          <Button size="sm" variant="soft" onClick={() => onNavigate('focus')}>
            Góc tập trung
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard({ onNavigate, onOpenSettings }) {
  const [todos, setTodos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const [notes] = useCozyStorage(STORAGE_KEYS.STICKY_NOTES);
  const [expenses] = useCozyStorage(STORAGE_KEYS.EXPENSES);
  const [diaryEntries, setDiaryEntries] = useCozyStorage(STORAGE_KEYS.DIARY_ENTRIES);
  const [settings] = useCozyStorage(STORAGE_KEYS.SETTINGS);

  const pomo = usePomodoroState();
  const { toast, celebrate } = useToast();
  const [quickTitle, setQuickTitle] = useState('');

  const today = todayISO();
  const now = new Date();
  const greeting = getGreeting(now);
  const quote = QUOTES[(now.getDate() + now.getMonth()) % QUOTES.length];

  const categories = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...todos.map((t) => t.category).filter(Boolean)])],
    [todos]
  );

  const todayTodos = useMemo(
    () => sortTodos(todos.filter((t) => t.date === today || (!t.completed && t.date < today))),
    [todos, today]
  );
  const overdueTodos = useMemo(
    () => todos.filter((t) => !t.completed && t.date < today),
    [todos, today]
  );

  const doneToday = todos.filter((t) => t.date === today && t.completed).length;
  const totalToday = todos.filter((t) => t.date === today).length;

  // Chuỗi ngày hoạt động liên tiếp (Streak) & biểu đồ 7 ngày
  const { todayPomoSessions, streakDays, weekBars } = useMemo(() => {
    const history = pomo.config.dailyHistory || {};
    const todayRec = history[today] || { sessions: 0, minutes: 0 };

    let streak = 0;
    for (let i = 0; i < 365; i += 1) {
      const d = addDaysISO(today, -i);
      const activeDay =
        (history[d]?.sessions || 0) > 0 ||
        todos.some((t) => t.completed && t.date === d) ||
        diaryEntries.some((e) => e.date === d);
      if (activeDay) streak += 1;
      else if (i > 0) break;
    }

    const bars = Array.from({ length: 7 }, (_, idx) => {
      const iso = addDaysISO(today, idx - 6);
      const mins = history[iso]?.minutes || 0;
      const done = todos.filter((t) => t.completed && t.date === iso).length;
      return {
        iso,
        label: iso === today ? 'Nay' : formatShortDate(iso),
        minutes: mins,
        done,
        score: mins + done * 15,
      };
    });

    return {
      todayPomoSessions: todayRec.sessions,
      streakDays: streak,
      weekBars: bars,
    };
  }, [pomo.config.dailyHistory, todos, diaryEntries, today]);

  const maxWeekScore = Math.max(30, ...weekBars.map((b) => b.score));

  const pinnedNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt - a.updatedAt)
        .slice(0, 4),
    [notes]
  );

  const monthKey = today.slice(0, 7);
  const monthBudget =
    expenses?.monthlyBudgets?.[monthKey] ?? Number(expenses?.monthlyBudget || 0);
  const allTx = expenses?.transactions || [];
  const monthExpense = allTx
    .filter((t) => t.type === 'expense' && t.date?.startsWith(monthKey))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalBalance =
    (Number(expenses?.baseBalance) || 0) +
    allTx.reduce(
      (s, t) => s + (t.type === 'income' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)),
      0
    );

  const todayDiary = useMemo(
    () => diaryEntries.find((e) => e.date === today) || null,
    [diaryEntries, today]
  );

  const addQuick = () => {
    const title = quickTitle.trim();
    if (!title) return;
    setTodos((prev) => [
      ...prev,
      { id: uid(), title, date: today, priority: 'medium', category: 'Cá nhân', completed: false, subtasks: [] },
    ]);
    setQuickTitle('');
  };

  const toggle = (id) => {
    const target = todos.find((t) => t.id === id);
    const willComplete = target && !target.completed && target.date === today;
    setTodos((prev) => applyToggleTodoList(prev, id));
    if (willComplete && totalToday > 0 && doneToday + 1 === totalToday) {
      celebrate('Hoàn thành 100% công việc hôm nay rồi! Giỏi quá đi 🎉');
    }
  };

  const remove = (id) => {
    const removed = todos.find((t) => t.id === id);
    if (!removed) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    toast({
      message: `Đã xóa việc "${removed.title.slice(0, 30)}"`,
      onUndo: () => setTodos((prev) => [...prev, removed]),
    });
  };

  const updateTodo = (updated) =>
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  const rolloverOverdue = () => {
    const count = overdueTodos.length;
    if (!count) return;
    setTodos((prev) =>
      prev.map((t) => (!t.completed && t.date < today ? { ...t, date: today } : t))
    );
    toast({ message: `🌅 Đã dời ${count} việc cũ sang hôm nay!` });
  };

  const handleQuickMood = (moodKey, moodLabel) => {
    if (todayDiary) {
      setDiaryEntries((prev) =>
        prev.map((e) => (e.id === todayDiary.id ? { ...e, mood: moodKey } : e))
      );
      toast({ message: `Đã cập nhật cảm xúc hôm nay: ${moodLabel} 🌸` });
    } else {
      const entry = {
        id: uid(),
        date: today,
        mood: moodKey,
        title: `Cảm xúc ngày ${formatShortDate(today)}: ${moodLabel}`,
        content: '',
        paperColor: '#FFF9F9',
        photos: [],
      };
      setDiaryEntries((prev) => [entry, ...prev]);
      toast({ message: `Đã ghi nhận cảm xúc "${moodLabel}" cho hôm nay!` });
    }
  };

  const progress = totalToday ? Math.round((doneToday / totalToday) * 100) : 0;
  const isFreshApp =
    todos.length === 0 && notes.length === 0 && (expenses?.transactions || []).length === 0 && diaryEntries.length === 0;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Card className="relative h-56 overflow-hidden p-0">
        <ImageSlot
          slotId="dashboard_banner"
          defaultSvg={<DashboardBannerSvg />}
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-cozy-bg via-cozy-bg/85 to-transparent" />
        <div className="pointer-events-none relative flex h-full max-w-xl flex-col justify-center px-8">
          <div className="flex items-center gap-2 text-xs font-bold text-cozy-muted">
            <span>{formatLongDate(now)}</span>
            {streakDays > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cozy-butter px-2.5 py-0.5 text-cozy-text">
                <Flame size={12} className="text-cozy-accent" /> Chuỗi {streakDays} ngày
              </span>
            )}
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-cozy-text sm:text-3xl">
            <span>
              {greeting.text}, {settings?.userName || 'bạn nhỏ'}
            </span>
            <Sparkles size={22} className="shrink-0 text-cozy-accent" strokeWidth={1.75} />
          </h1>
          <p className="mt-1.5 text-sm text-cozy-text/85">{quote}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 w-44 overflow-hidden rounded-full bg-cozy-card/90 ring-1 ring-cozy-line">
              <div className="h-full rounded-full bg-cozy-matcha transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-bold text-cozy-muted">
              {totalToday ? `${doneToday}/${totalToday} việc hôm nay (${progress}%)` : 'Hôm nay chưa có việc nào'}
            </span>
          </div>
        </div>
      </Card>

      {/* Lời chào cho người dùng mới lần đầu mở app */}
      {isFreshApp && onOpenSettings && (
        <Card tone="blush" className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cozy-butter text-cozy-text">
              <Sparkles size={18} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-bold text-cozy-text">Chào mừng bạn đến với CozySpace Desktop!</p>
              <p className="text-xs text-cozy-muted">
                Mọi dữ liệu & hình ảnh của bạn được lưu an toàn ngay trên ổ cứng máy tính. Bạn có muốn nạp dữ liệu mẫu để khám phá thử không?
              </p>
            </div>
          </div>
          <Button size="sm" variant="butter" onClick={onOpenSettings}>
            <Sparkles size={14} /> Mở Cài đặt & Dữ liệu mẫu
          </Button>
        </Card>
      )}

      {/* Thanh trạng thái ngày mới (Minimalist Status Strip) — Không viền hộp, không cắt cụt số tiền */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <StatusStripItem
          icon={CheckCircle2}
          label="Việc hôm nay"
          value={`${doneToday}/${totalToday}`}
          sub={`${todayTodos.filter((t) => !t.completed).length} việc đang chờ`}
          onClick={() => onNavigate('calendar')}
        />

        <span className="hidden h-7 w-px sm:block" style={{ backgroundColor: 'var(--border-subtle)' }} />

        <StatusStripItem
          icon={Timer}
          label="Tập trung hôm nay"
          value={`${todayPomoSessions} phiên`}
          sub={`Tổng tích lũy: ${pomo.config.completedSessions || 0} phiên`}
          onClick={() => onNavigate('focus')}
        />

        <span className="hidden h-7 w-px lg:block" style={{ backgroundColor: 'var(--border-subtle)' }} />

        <StatusStripItem
          icon={StickyNote}
          label="Ghi chú nhanh"
          value={`${notes.length} ghi chú`}
          sub={`${notes.filter((n) => n.isPinned).length} đã ghim`}
          onClick={() => onNavigate('notes')}
        />

        <span className="hidden h-7 w-px sm:block" style={{ backgroundColor: 'var(--border-subtle)' }} />

        <StatusStripItem
          icon={Wallet}
          label="Tổng số dư hiện có"
          value={`${totalBalance.toLocaleString('vi-VN')}₫`}
          sub={
            monthExpense > 0
              ? `Đã chi tháng này: ${monthExpense.toLocaleString('vi-VN')}₫`
              : monthBudget
                ? `Hạn mức ${Number(monthBudget).toLocaleString('vi-VN')}₫`
                : 'Quản lý quỹ & thu chi'
          }
          onClick={() => onNavigate('expenses')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Cột trái: Việc cần làm hôm nay + Biểu đồ nhịp độ 7 ngày */}
        <div className="space-y-6 xl:col-span-3">
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-cozy-text">
                <ListTodo size={18} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Việc cần làm hôm nay</span>
              </h2>
              <div className="flex items-center gap-2">
                {overdueTodos.length > 0 && (
                  <Button variant="soft" size="sm" onClick={rolloverOverdue}>
                    <Sunrise size={14} className="text-cozy-accent" /> Dời {overdueTodos.length} việc cũ sang nay
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onNavigate('calendar')}>
                  Xem lịch <ArrowRight size={14} />
                </Button>
              </div>
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
              <EmptyState
                title="Hôm nay thật thảnh thơi"
                hint="Thêm một việc nhỏ để bắt đầu ngày mới thật năng suất nhé!"
                size="w-36"
              />
            ) : (
              <ul className="cozy-scroll max-h-96 overflow-y-auto px-1">
                {todayTodos.map((t) => (
                  <TodoItem
                    key={t.id}
                    todo={t}
                    onToggle={toggle}
                    onDelete={remove}
                    onUpdate={updateTodo}
                    onFocus={(item) => {
                      pomo.startFocusOn({ type: 'todo', id: item.id, title: item.title });
                      toast({ message: `Bắt đầu tập trung: "${item.title}"`, tone: 'info' });
                    }}
                    categories={categories}
                    showDate={t.date !== today}
                  />
                ))}
              </ul>
            )}
          </Card>

          {/* Biểu đồ Nhịp độ 7 ngày gần nhất */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-cozy-text">
                  <BarChart3 size={17} strokeWidth={1.75} className="text-cozy-accent" />
                  <span>Nhịp độ 7 ngày qua</span>
                </h2>
                <p className="text-xs text-cozy-muted">Kết hợp số phút tập trung Pomodoro & đầu việc đã hoàn thành</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-cozy-blush px-3 py-1 text-xs font-bold text-cozy-text">
                <Flame size={13} className="text-cozy-accent" /> Streak: {streakDays} ngày
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2">
              {weekBars.map((b) => {
                const heightPct = b.score > 0 ? Math.max(14, Math.round((b.score / maxWeekScore) * 100)) : 6;
                const isTodayBar = b.iso === today;
                return (
                  <div key={b.iso} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-24 w-full items-end justify-center rounded-2xl bg-cozy-blush/80 p-1.5">
                      <div
                        title={`${b.minutes} phút tập trung · ${b.done} việc xong`}
                        className={cx(
                          'w-full rounded-xl transition-all duration-300',
                          b.score === 0
                            ? 'bg-cozy-line'
                            : isTodayBar
                              ? 'bg-cozy-peach'
                              : 'bg-cozy-matcha/75'
                        )}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className={cx('text-[11px] font-bold', isTodayBar ? 'text-cozy-accent' : 'text-cozy-muted')}>
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Cột phải: Đồng hồ tập trung + Cảm xúc hôm nay + Ghi chú ghim */}
        <div className="space-y-6 xl:col-span-2">
          <DashboardFocusCard onNavigate={onNavigate} />

          {/* Check-in cảm xúc nhanh */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-cozy-text">
                <Heart size={16} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Hôm nay bạn thấy thế nào?</span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('diary')}>
                Nhật ký <ArrowRight size={14} />
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_SUB_SLOTS.map((m) => {
                const active = todayDiary?.mood === m.mood;
                return (
                  <button
                    key={m.slotId}
                    type="button"
                    onClick={() => handleQuickMood(m.mood, m.label)}
                    className={cx(
                      'flex flex-col items-center gap-1 rounded-2xl border p-2 transition',
                      active
                        ? 'border-cozy-peach bg-cozy-blush shadow-sm ring-2 ring-cozy-peach/25'
                        : 'border-cozy-line bg-cozy-card hover:bg-cozy-blush/60'
                    )}
                  >
                    <div className="h-9 w-9">
                      <ImageSlot
                        slotId={m.slotId}
                        defaultSvg={<m.Svg />}
                        editable={false}
                        fit="contain"
                        className="h-full w-full"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-cozy-text">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Ghi chú gần đây */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-cozy-text">
                <Pin size={16} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Ghi chú gần đây</span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('notes')}>
                Tất cả <ArrowRight size={14} />
              </Button>
            </div>
            {pinnedNotes.length === 0 ? (
              <EmptyState
                title="Chưa có ghi chú"
                hint="Ghi lại ý tưởng chợt đến ở mục Ghi chú nhanh."
                size="w-28"
                className="py-4"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {pinnedNotes.map((n) => {
                  const previewText =
                    n.mode === 'checklist' && Array.isArray(n.checklist) && n.checklist.length
                      ? n.checklist.map((c) => `${c.done ? '☑' : '☐'} ${c.text}`).join('\n')
                      : n.content;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => onNavigate('notes')}
                      className="relative min-h-[88px] rounded-2xl border border-cozy-line p-3 text-left text-xs text-[#3E3634] shadow-sm transition hover:-rotate-1"
                      style={{ backgroundColor: NOTE_COLORS.find((c) => c.id === n.color)?.bg || n.color || '#FFF3B0' }}
                    >
                      {n.isPinned && <Pin size={12} className="absolute right-2 top-2 fill-[#F4ACB7] text-[#C45468]" />}
                      <p className="line-clamp-3 whitespace-pre-wrap pr-3 font-medium">
                        {previewText || <i className=" opacity-60">(trống)</i>}
                      </p>
                      <p className="mt-2 text-[11px] opacity-70">{formatRelativeTime(n.updatedAt)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
