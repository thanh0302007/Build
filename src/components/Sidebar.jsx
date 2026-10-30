// Khung Sidebar điều hướng 7 khu vực của CozySpace
import { useMemo } from 'react';
import {
  Home,
  CalendarCheck,
  BookOpen,
  Headphones,
  NotebookPen,
  StickyNote,
  Wallet,
  Images,
  Play,
  Pause,
  Music2,
  Square,
} from 'lucide-react';
import { ImageSlot, useImages } from './ImageSlot.jsx';
import { UserAvatarSvg } from '../assets/defaultSvgs.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { todayISO, getGreeting } from '../lib/utils.js';
import { usePomodoro, formatClock, MODE_META } from '../context/PomodoroContext.jsx';
import { cx } from './ui.jsx';

// 7 khu vực theo PROJECT_RULES.md mục I.2
export const NAV_ITEMS = [
  { id: 'dashboard', index: 0, label: 'Trang chủ', icon: Home, tint: 'bg-cozy-peach/25' },
  { id: 'calendar', index: 1, label: 'Lịch & To-do', icon: CalendarCheck, tint: 'bg-cozy-matcha/30' },
  { id: 'study', index: 2, label: 'Học tập + Gemini', icon: BookOpen, tint: 'bg-cozy-lavender' },
  { id: 'focus', index: 3, label: 'Tập trung', icon: Headphones, tint: 'bg-cozy-butter' },
  { id: 'diary', index: 4, label: 'Nhật ký & Cảm xúc', icon: NotebookPen, tint: 'bg-cozy-peach/25' },
  { id: 'notes', index: 5, label: 'Ghi chú nhanh', icon: StickyNote, tint: 'bg-cozy-butter' },
  { id: 'expenses', index: 6, label: 'Sổ thu chi', icon: Wallet, tint: 'bg-cozy-matcha/30' },
];

function MiniPlayer({ onOpen }) {
  const {
    status,
    mode,
    remainingMs,
    totalMs,
    start,
    pause,
    currentTrack,
    trackPlaying,
    toggleTrackPlayback,
    stopTrack,
  } = usePomodoro();

  const hasTimer = status !== 'idle';
  const hasMusic = Boolean(currentTrack);
  if (!hasTimer && !hasMusic) return null;

  const pct = totalMs ? (1 - remainingMs / totalMs) * 100 : 0;

  return (
    <div className="mx-3 mb-3 space-y-2.5 rounded-3xl border border-cozy-line bg-cozy-blush/95 p-3 shadow-sm">
      {/* Đồng hồ Pomodoro đếm ngược */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="text-[11px] font-bold text-cozy-muted">
            {MODE_META[mode].emoji} {MODE_META[mode].label} ·{' '}
            {status === 'running' ? 'Đang đếm' : status === 'paused' ? 'Tạm dừng' : 'Sẵn sàng'}
          </p>
          <p className="text-base font-bold tabular-nums text-cozy-text">{formatClock(remainingMs)}</p>
        </button>
        <button
          type="button"
          onClick={status === 'running' ? pause : start}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cozy-peach text-white shadow-sm transition hover:brightness-105"
          title={status === 'running' ? 'Tạm dừng Pomodoro' : 'Tiếp tục Pomodoro'}
        >
          {status === 'running' ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>

      {hasTimer && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white">
          <div
            className={cx('h-full rounded-full transition-all', mode === 'work' ? 'bg-cozy-peach' : 'bg-cozy-matcha')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Trạng thái nhạc YouTube đang phát nền */}
      {hasMusic && (
        <div className="flex items-center gap-2 rounded-2xl border border-cozy-line bg-white px-2.5 py-2">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            title="Mở Khu vực Tập trung"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cozy-butter text-xs">
              <Music2 size={14} className={cx('text-cozy-peach', trackPlaying && 'animate-pulse')} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-cozy-text">{currentTrack.title}</span>
              <span className="block text-[10px] font-semibold text-cozy-muted">
                {trackPlaying ? '🎶 Đang phát nhạc nền' : '⏸ Đã tạm dừng nhạc'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={toggleTrackPlayback}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cozy-matcha/30 text-cozy-text transition hover:bg-cozy-matcha/50"
            title={trackPlaying ? 'Tạm dừng nhạc' : 'Tiếp tục phát nhạc'}
          >
            {trackPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            type="button"
            onClick={stopTrack}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cozy-blush text-cozy-muted transition hover:text-cozy-peach"
            title="Tắt nhạc"
          >
            <Square size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ active, onNavigate }) {
  const { openManager } = useImages();
  const [todos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const [notes] = useCozyStorage(STORAGE_KEYS.STICKY_NOTES);
  const [subjects] = useCozyStorage(STORAGE_KEYS.SUBJECTS);
  const [diaryEntries] = useCozyStorage(STORAGE_KEYS.DIARY_ENTRIES);
  const greeting = getGreeting();

  const badges = useMemo(() => {
    const today = todayISO();
    return {
      calendar: todos.filter((t) => !t.completed && t.date <= today).length,
      study: subjects.length,
      diary: diaryEntries.filter((e) => e.date === today).length,
      notes: notes.filter((n) => n.isPinned).length,
    };
  }, [todos, subjects, diaryEntries, notes]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-cozy-line bg-white/80 backdrop-blur-md">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 pb-4 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cozy-peach text-lg shadow-sm">🌸</div>
        <div>
          <p className="text-lg font-bold leading-none text-cozy-text">CozySpace</p>
          <p className="text-[11px] text-cozy-muted">góc nhỏ bình yên</p>
        </div>
      </div>

      {/* Hồ sơ */}
      <div className="mx-4 mb-4 flex items-center gap-3 rounded-3xl border border-cozy-line bg-cozy-blush p-3">
        <ImageSlot
          slotId="user_avatar"
          defaultSvg={<UserAvatarSvg />}
          compact
          buttonPosition="center"
          className="h-12 w-12 shrink-0 rounded-full border-2 border-white shadow-sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-cozy-text">Cozy Friend</p>
          <p className="truncate text-xs text-cozy-muted">
            {greeting.emoji} {greeting.text}
          </p>
        </div>
      </div>

      {/* Điều hướng */}
      <nav className="cozy-scroll flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const badge = badges[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cx(
                'group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-all',
                isActive ? 'bg-cozy-blush text-cozy-text shadow-sm ring-1 ring-cozy-line' : 'text-cozy-muted hover:bg-cozy-blush/70 hover:text-cozy-text'
              )}
            >
              <span
                className={cx(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition',
                  isActive ? item.tint : 'bg-transparent group-hover:bg-white'
                )}
              >
                <Icon size={17} />
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {badge > 0 && (
                <span className="rounded-full bg-cozy-peach px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <MiniPlayer onOpen={() => onNavigate('focus')} />

      {/* Kho ảnh */}
      <div className="border-t border-cozy-line p-3">
        <button
          type="button"
          onClick={openManager}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-cozy-muted transition hover:bg-cozy-lavender/50 hover:text-cozy-text"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cozy-lavender/60">
            <Images size={17} />
          </span>
          Kho ảnh (9 vị trí)
        </button>
      </div>
    </aside>
  );
}

