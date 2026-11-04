// Khung Sidebar điều hướng 7 khu vực của CozySpace Desktop (hỗ trợ thu gọn, đổi nhanh 4 chủ đề & tìm kiếm nhanh)
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
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  CloudRain,
  Sparkles,
  Image as ImageIcon,
  Target,
  Timer,
} from 'lucide-react';
import { ImageSlot, useImages } from './ImageSlot.jsx';
import { UserAvatarSvg } from '../assets/defaultSvgs.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { todayISO, getGreeting } from '../lib/utils.js';
import {
  usePomodoroState,
  usePomodoroClock,
  formatClock,
  MODE_META,
} from '../context/PomodoroContext.jsx';
import { cx, IconButton } from './ui.jsx';

export const THEME_OPTIONS = [
  { id: 'sakura-cream', label: 'Sakura Cream', dot: '#E5989B', bg: '#FAF7F2' },
  { id: 'botanical-matcha', label: 'Botanical Matcha', dot: '#6B9080', bg: '#F4F7F4' },
  { id: 'vintage-cafe', label: 'Vintage Cafe', dot: '#A67B5B', bg: '#F5EFE6' },
  { id: 'midnight-lofi', label: 'Midnight Lofi', dot: '#4ADE80', bg: '#14241D' },
];

const LEGACY_THEME_MAP = {
  pastel: 'sakura-cream',
  matcha: 'botanical-matcha',
  night: 'midnight-lofi',
};

export function resolveThemeId(theme) {
  if (!theme) return 'sakura-cream';
  return LEGACY_THEME_MAP[theme] || theme;
}

export const NAV_ITEMS = [
  { id: 'dashboard', index: 0, label: 'Trang chủ', icon: Home, tint: 'bg-cozy-peach/20' },
  { id: 'calendar', index: 1, label: 'Lịch & To-do', icon: CalendarCheck, tint: 'bg-cozy-matcha/25' },
  { id: 'study', index: 2, label: 'Học tập + Gemini', icon: BookOpen, tint: 'bg-cozy-lavender' },
  { id: 'focus', index: 3, label: 'Tập trung', icon: Headphones, tint: 'bg-cozy-butter' },
  { id: 'diary', index: 4, label: 'Nhật ký & Cảm xúc', icon: NotebookPen, tint: 'bg-cozy-peach/20' },
  { id: 'notes', index: 5, label: 'Ghi chú nhanh', icon: StickyNote, tint: 'bg-cozy-butter' },
  { id: 'expenses', index: 6, label: 'Sổ thu chi', icon: Wallet, tint: 'bg-cozy-matcha/25' },
];

function MiniPlayer({ collapsed, onOpen }) {
  const {
    status,
    mode,
    focusTarget,
    start,
    pause,
    currentTrack,
    trackPlaying,
    toggleTrackPlayback,
    stopTrack,
    hasActiveAmbient,
    stopAllAmbient,
  } = usePomodoroState();
  const { remainingMs, totalMs } = usePomodoroClock();

  const hasTimer = status !== 'idle';
  const hasMusic = Boolean(currentTrack);
  if (!hasTimer && !hasMusic && !hasActiveAmbient) return null;

  if (collapsed) {
    return (
      <div
        className="mx-2 mb-2 flex flex-col items-center gap-1.5 rounded-2xl p-2"
        style={{ backgroundColor: 'rgba(140, 126, 126, 0.08)' }}
      >
        <button
          type="button"
          onClick={onOpen}
          title={`${MODE_META[mode].label}: ${formatClock(remainingMs)}`}
          className="text-center text-[11px] font-bold tabular-nums text-cozy-text"
        >
          {formatClock(remainingMs)}
        </button>
        <button
          type="button"
          onClick={status === 'running' ? pause : start}
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-cozy-peach text-[#2A2120]"
          title={status === 'running' ? 'Tạm dừng' : 'Bắt đầu'}
        >
          {status === 'running' ? <Pause size={13} /> : <Play size={13} />}
        </button>
      </div>
    );
  }

  const pct = totalMs ? (1 - remainingMs / totalMs) * 100 : 0;

  return (
    <div
      className="mx-3 mb-2.5 space-y-2 rounded-2xl p-3"
      style={{
        backgroundColor: 'rgba(140, 126, 126, 0.08)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-cozy-muted">
            <Timer size={12} className="shrink-0 text-cozy-accent" />
            <span>
              {MODE_META[mode].label} ·{' '}
              {status === 'running' ? 'Đang đếm' : status === 'paused' ? 'Tạm dừng' : 'Sẵn sàng'}
            </span>
          </p>
          <p className="text-base font-bold tabular-nums text-cozy-text">{formatClock(remainingMs)}</p>
          {focusTarget && (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-cozy-accent">
              <Target size={11} className="shrink-0" />
              <span className="line-clamp-1">{focusTarget.title}</span>
            </p>
          )}
        </button>
        <button
          type="button"
          onClick={status === 'running' ? pause : start}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cozy-peach text-[#2A2120] shadow-sm transition hover:brightness-105"
          title={status === 'running' ? 'Tạm dừng Pomodoro' : 'Tiếp tục Pomodoro'}
        >
          {status === 'running' ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>

      {hasTimer && (
        <div className="h-1.5 overflow-hidden rounded-full bg-cozy-card/70">
          <div
            className={cx('h-full rounded-full transition-all', mode === 'work' ? 'bg-cozy-peach' : 'bg-cozy-matcha')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {hasMusic && (
        <div
          className="flex items-center gap-2 pt-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            title="Mở Khu vực Tập trung"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cozy-butter/70 text-xs">
              <Music2 size={14} className={cx('text-cozy-accent', trackPlaying && 'animate-pulse')} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block line-clamp-1 text-xs font-bold text-cozy-text">{currentTrack.title}</span>
              <span className="block text-[11px] font-semibold text-cozy-muted">
                {trackPlaying ? 'Đang phát' : 'Tạm dừng'}
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
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-cozy-muted transition hover:text-cozy-accent"
            title="Tắt nhạc"
          >
            <Square size={12} />
          </button>
        </div>
      )}

      {hasActiveAmbient && (
        <div
          className="flex items-center justify-between pt-2 text-[11px] font-semibold text-cozy-text"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="flex items-center gap-1.5">
            <CloudRain size={13} className="text-cozy-matcha" /> Đang phát âm thanh trắng
          </span>
          <button
            type="button"
            onClick={stopAllAmbient}
            className="font-bold text-cozy-accent hover:underline"
          >
            Tắt
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ active, onNavigate, onOpenCommand, onOpenSettings }) {
  const { openManager, openEditor } = useImages();
  const [todos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const [notes] = useCozyStorage(STORAGE_KEYS.STICKY_NOTES);
  const [subjects] = useCozyStorage(STORAGE_KEYS.SUBJECTS);
  const [diaryEntries] = useCozyStorage(STORAGE_KEYS.DIARY_ENTRIES);
  const [settings, setSettings] = useCozyStorage(STORAGE_KEYS.SETTINGS);

  const collapsed = Boolean(settings?.sidebarCollapsed);
  const activeTheme = resolveThemeId(settings?.theme);
  const greeting = getGreeting();

  const toggleCollapse = () =>
    setSettings((prev) => ({ ...prev, sidebarCollapsed: !prev?.sidebarCollapsed }));

  const selectTheme = (themeId) =>
    setSettings((prev) => ({ ...prev, theme: themeId }));

  const badges = useMemo(() => {
    const today = todayISO();
    return {
      calendar: todos.filter((t) => !t.completed && t.date <= today).length,
      study: subjects.length,
      diary: diaryEntries.filter((e) => e.date === today).length,
      notes: notes.filter((n) => n.isPinned).length,
    };
  }, [todos, subjects, diaryEntries, notes]);

  // Làm sạch emoji hệ thống khỏi tagline cũ nếu người dùng chưa đổi
  const cleanTagline = (settings?.userTagline || greeting.text).replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
    ''
  ).trim();

  return (
    <aside
      className={cx(
        'cozy-stationery-card flex h-full shrink-0 flex-col border-y-0 border-l-0 transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-[272px]'
      )}
    >
      {/* Logo & Nút thu gọn */}
      <div className={cx('flex items-center pb-3 pt-5', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-sm"
            style={{
              backgroundColor: 'var(--accent)',
              color: activeTheme === 'midnight-lofi' ? '#14241D' : '#FFFFFF',
            }}
          >
            <Sparkles size={18} strokeWidth={1.75} />
          </div>
          {!collapsed && (
            <div>
              <p className="text-lg font-bold leading-none text-cozy-text">CozySpace</p>
              <p className="mt-0.5 text-[11px] font-medium text-cozy-muted">góc nhỏ bình yên</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <IconButton title="Thu gọn thanh bên (Ctrl + B)" onClick={toggleCollapse}>
            <PanelLeftClose size={16} />
          </IconButton>
        )}
      </div>

      {collapsed && (
        <div className="mb-2 flex justify-center">
          <IconButton title="Mở rộng thanh bên (Ctrl + B)" onClick={toggleCollapse}>
            <PanelLeftOpen size={16} />
          </IconButton>
        </div>
      )}

      {/* Hồ sơ người dùng — làm phẳng, nền trong suốt nhẹ rgba, hiển thị trọn vẹn slogan không cắt '...' */}
      {collapsed ? (
        <div className="mx-auto mb-3">
          <ImageSlot
            slotId="user_avatar"
            defaultSvg={<UserAvatarSvg />}
            compact
            buttonPosition="center"
            className="h-11 w-11 rounded-full shadow-sm"
          />
        </div>
      ) : (
        <div
          className="mx-3.5 mb-2.5 flex items-center gap-3 rounded-2xl px-3 py-2.5"
          style={{ backgroundColor: 'rgba(140, 126, 126, 0.08)' }}
        >
          <ImageSlot
            slotId="user_avatar"
            defaultSvg={<UserAvatarSvg />}
            compact
            buttonPosition="center"
            className="h-11 w-11 shrink-0 rounded-full shadow-sm"
          />
          <button
            type="button"
            onClick={onOpenSettings}
            title="Bấm để đổi tên & cá nhân hóa"
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-sm font-bold leading-tight text-cozy-text">
              {settings?.userName || 'Cozy Friend'}
            </p>
            <p className="mt-0.5 break-words text-[11.5px] leading-snug text-cozy-muted">
              {cleanTagline || greeting.text}
            </p>
          </button>
        </div>
      )}

      {/* Thanh tìm kiếm nhanh Ctrl + K — làm phẳng, bỏ viền đậm, chỉ dùng nền trong suốt nhẹ rgba */}
      <div className={cx('mb-2.5', collapsed ? 'px-2.5' : 'px-3.5')}>
        <button
          type="button"
          onClick={onOpenCommand}
          title="Tìm kiếm & Bảng lệnh nhanh (Ctrl + K)"
          className={cx(
            'flex w-full items-center gap-2 rounded-2xl text-xs font-semibold text-cozy-muted transition hover:text-cozy-text',
            collapsed ? 'justify-center py-2.5' : 'px-3 py-2'
          )}
          style={{ backgroundColor: 'rgba(140, 126, 126, 0.08)' }}
        >
          <Search size={14} className="shrink-0" style={{ color: 'var(--accent)' }} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Tìm nhanh...</span>
              <kbd
                className="rounded-md px-1.5 py-0.5 font-mono text-[10px] text-cozy-muted"
                style={{ backgroundColor: 'rgba(140, 126, 126, 0.1)' }}
              >
                Ctrl K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Điều hướng 7 khu vực — badge đổi sang chữ số nhỏ tinh tế màu --text-muted */}
      <nav className="cozy-scroll flex-1 space-y-0.5 overflow-y-auto px-2.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const badge = badges[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={collapsed ? `${item.label} (Ctrl+${item.index + 1})` : undefined}
              className={cx(
                'group relative flex w-full items-center gap-3 rounded-2xl py-2.5 text-left text-sm font-bold transition-all',
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive
                  ? 'bg-cozy-blush/90 text-cozy-text'
                  : 'text-cozy-muted hover:bg-cozy-blush/50 hover:text-cozy-text'
              )}
            >
              <span
                className={cx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition',
                  isActive ? item.tint : 'bg-transparent group-hover:bg-cozy-card/60'
                )}
              >
                <Icon size={17} strokeWidth={1.75} />
              </span>
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {badge > 0 && !collapsed && (
                <span className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-[var(--text-muted)]">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                  {badge}
                </span>
              )}
              {badge > 0 && collapsed && (
                <span
                  className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <MiniPlayer collapsed={collapsed} onOpen={() => onNavigate('focus')} />

      {/* Chân Sidebar: Thanh công cụ Chủ đề (4 chấm màu) + Đổi nền + Kho ảnh + Cài đặt */}
      <div
        className="space-y-1.5 p-2.5"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {/* Thanh chuyển nhanh 4 Chủ đề & Hình nền */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div className="grid grid-cols-2 gap-1.5">
              {THEME_OPTIONS.map((t) => {
                const isSelected = activeTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTheme(t.id)}
                    title={`Chủ đề: ${t.label}`}
                    className={cx(
                      'h-4 w-4 rounded-full transition-transform',
                      isSelected ? 'scale-110 ring-2 ring-[var(--text-primary)] ring-offset-1' : 'opacity-75 hover:opacity-100'
                    )}
                    style={{ backgroundColor: t.dot }}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => openEditor('app_bg')}
              title="Đổi hình nền ứng dụng (app_bg)"
              className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-xl text-cozy-muted transition hover:bg-cozy-blush hover:text-cozy-text"
            >
              <ImageIcon size={14} strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div
            className="flex items-center justify-between rounded-2xl px-3 py-2"
            style={{ backgroundColor: 'rgba(140, 126, 126, 0.08)' }}
          >
            <div className="flex items-center gap-2">
              {THEME_OPTIONS.map((t) => {
                const isSelected = activeTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTheme(t.id)}
                    title={`Chủ đề: ${t.label}`}
                    aria-label={`Chủ đề ${t.label}`}
                    className={cx(
                      'h-4 w-4 rounded-full transition-all',
                      isSelected
                        ? 'scale-110 ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-app)]'
                        : 'opacity-75 hover:scale-105 hover:opacity-100'
                    )}
                    style={{ backgroundColor: t.dot }}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => openEditor('app_bg')}
              title="Đổi hình nền ứng dụng (app_bg)"
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold text-cozy-muted transition hover:bg-cozy-card/70 hover:text-cozy-text"
            >
              <ImageIcon size={13} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
              <span>Đổi nền</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={openManager}
          title="Kho ảnh (9 vị trí)"
          className={cx(
            'flex w-full items-center gap-3 rounded-2xl py-2 text-xs font-bold text-cozy-muted transition hover:bg-cozy-blush/60 hover:text-cozy-text',
            collapsed ? 'justify-center px-2' : 'px-3'
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cozy-lavender/60 text-cozy-text">
            <Images size={15} strokeWidth={1.75} />
          </span>
          {!collapsed && <span>Kho ảnh (9 vị trí)</span>}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Cài đặt, Chủ đề & Sao lưu ổ cứng"
          className={cx(
            'flex w-full items-center gap-3 rounded-2xl py-2 text-xs font-bold text-cozy-muted transition hover:bg-cozy-blush/60 hover:text-cozy-text',
            collapsed ? 'justify-center px-2' : 'px-3'
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cozy-peach/20 text-cozy-text">
            <Settings size={15} strokeWidth={1.75} />
          </span>
          {!collapsed && <span>Cài đặt & Dữ liệu</span>}
        </button>
      </div>
    </aside>
  );
}
