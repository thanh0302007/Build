// Khung ứng dụng chính của CozySpace Desktop 1.0
import { useEffect, useRef, useState } from 'react';
import { ImageProvider, ImageSlot } from './components/ImageSlot.jsx';
import ImageManager from './components/ImageManager.jsx';
import Sidebar, { NAV_ITEMS } from './components/Sidebar.jsx';
import { PomodoroProvider } from './context/PomodoroContext.jsx';
import { ToastProvider, useToast } from './components/Toast.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CalendarTodo from './pages/CalendarTodo.jsx';
import StudyHub from './pages/StudyHub.jsx';
import FocusZone from './pages/FocusZone.jsx';
import DiaryMood from './pages/DiaryMood.jsx';
import QuickNotes from './pages/QuickNotes.jsx';
import ExpenseTracker from './pages/ExpenseTracker.jsx';
import { AppBgSvg } from './assets/defaultSvgs.jsx';
import { STORAGE_KEYS, useCozyStorage } from './lib/storage.js';
import { playChime, todayISO } from './lib/utils.js';

const LEGACY_THEME_MAP = {
  pastel: 'sakura-cream',
  matcha: 'botanical-matcha',
  night: 'midnight-lofi',
};

export function normalizeThemeId(theme) {
  if (!theme) return 'sakura-cream';
  return LEGACY_THEME_MAP[theme] || theme;
}

function AppShell() {
  const [active, setActive] = useState('dashboard');
  const [visited, setVisited] = useState(() => ({ dashboard: true, focus: true }));
  const [cmdOpen, setCmdOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { toast } = useToast();
  const [settings, setSettings] = useCozyStorage(STORAGE_KEYS.SETTINGS);
  const [todos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const notifiedIdsRef = useRef(new Set());

  const navigate = (zoneId) => {
    setVisited((prev) => (prev[zoneId] ? prev : { ...prev, [zoneId]: true }));
    setActive(zoneId);
  };

  // Áp dụng chủ đề màu sắc lên thẻ <html>
  const activeTheme = normalizeThemeId(settings?.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
  }, [activeTheme]);

  // Hỗ trợ điều hướng xuyên phân khu qua CustomEvent
  useEffect(() => {
    const onNavEvent = (e) => {
      if (e.detail?.zone) navigate(e.detail.zone);
    };
    window.addEventListener('cozy-navigate', onNavEvent);
    return () => window.removeEventListener('cozy-navigate', onNavEvent);
  }, []);

  // Phím tắt bàn phím toàn cục (Ctrl+K, Ctrl+B, Ctrl+,, Ctrl+1..7)
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      } else if (k === 'b') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, sidebarCollapsed: !prev?.sidebarCollapsed }));
      } else if (k === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      } else if (/^[1-7]$/.test(k)) {
        const idx = Number(k) - 1;
        if (NAV_ITEMS[idx]) {
          e.preventDefault();
          navigate(NAV_ITEMS[idx].id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSettings]);

  // Bộ nhắc việc theo giờ (HH:mm) trong ngày
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const today = todayISO();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      todos.forEach((t) => {
        if (t.completed || t.date !== today || !t.time) return;
        const reminderKey = `${t.id}_${today}_${t.time}`;
        if (t.time === hhmm && !notifiedIdsRef.current.has(reminderKey)) {
          notifiedIdsRef.current.add(reminderKey);
          playChime();
          toast({ message: `⏰ Nhắc việc (${t.time}): ${t.title}`, tone: 'info', duration: 8000 });
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`⏰ Đến giờ rồi: ${t.title}`, {
                body: `Danh mục: ${t.category || 'Việc cần làm hôm nay'}`,
                silent: true,
              });
            }
          } catch {
            /* ignore */
          }
        }
      });
    };
    checkReminders();
    const timer = setInterval(checkReminders, 20000);
    return () => clearInterval(timer);
  }, [todos, toast]);

  const dimmerOpacity = Math.max(0, Math.min(35, Number(settings?.warmDimmer) || 0)) / 100;

  return (
    <div
      className="relative flex h-screen w-screen overflow-hidden text-cozy-text"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      {/* Vị trí ảnh số 1: app_bg - Hình nền toàn ứng dụng */}
      {activeTheme !== 'midnight-lofi' && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <ImageSlot slotId="app_bg" defaultSvg={<AppBgSvg />} editable={false} className="h-full w-full" />
        </div>
      )}

      {/* Lớp phủ Đèn bàn vàng ấm bảo vệ mắt ban đêm */}
      {dimmerOpacity > 0 && (
        <div
          className="pointer-events-none fixed inset-0 z-[90] mix-blend-multiply transition-opacity"
          style={{ backgroundColor: `rgba(255, 214, 153, ${dimmerOpacity})` }}
        />
      )}

      <div className="relative z-10 flex h-full w-full">
        <Sidebar
          active={active}
          onNavigate={navigate}
          onOpenCommand={() => setCmdOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="cozy-scroll flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-6xl pb-12">
            {active === 'dashboard' && (
              <div className="animate-fade-in">
                <ErrorBoundary>
                  <Dashboard onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)} />
                </ErrorBoundary>
              </div>
            )}

            {visited.calendar && (
              <div className={active === 'calendar' ? 'block animate-fade-in' : 'hidden'}>
                <ErrorBoundary>
                  <CalendarTodo />
                </ErrorBoundary>
              </div>
            )}

            {/* Giữ StudyHub không bị display:none để <webview> của Electron không bị chớp trắng */}
            {visited.study && (
              <div
                className={
                  active === 'study'
                    ? 'block animate-fade-in'
                    : 'pointer-events-none fixed -left-[9999px] top-0 h-[800px] w-[1100px] overflow-hidden opacity-0'
                }
              >
                <ErrorBoundary>
                  <StudyHub />
                </ErrorBoundary>
              </div>
            )}

            {/* Luôn giữ FocusZone trong DOM để nhạc YouTube & Pomodoro chạy xuyên suốt */}
            <div className={active === 'focus' ? 'block animate-fade-in' : 'hidden'}>
              <ErrorBoundary>
                <FocusZone />
              </ErrorBoundary>
            </div>

            {visited.diary && (
              <div className={active === 'diary' ? 'block animate-fade-in' : 'hidden'}>
                <ErrorBoundary>
                  <DiaryMood />
                </ErrorBoundary>
              </div>
            )}

            {visited.notes && (
              <div className={active === 'notes' ? 'block animate-fade-in' : 'hidden'}>
                <ErrorBoundary>
                  <QuickNotes onNavigate={navigate} />
                </ErrorBoundary>
              </div>
            )}

            {visited.expenses && (
              <div className={active === 'expenses' ? 'block animate-fade-in' : 'hidden'}>
                <ErrorBoundary>
                  <ExpenseTracker />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </main>
      </div>

      <ImageManager />
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={navigate}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ImageProvider>
        <PomodoroProvider>
          <AppShell />
        </PomodoroProvider>
      </ImageProvider>
    </ToastProvider>
  );
}
