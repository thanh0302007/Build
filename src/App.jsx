// Khung ứng dụng chính của CozySpace (đủ 7 khu vực theo PROJECT_RULES.md mục I.2)
import { useState } from 'react';
import { Camera } from 'lucide-react';
import { ImageProvider, ImageSlot, useImages } from './components/ImageSlot.jsx';
import ImageManager from './components/ImageManager.jsx';
import Sidebar from './components/Sidebar.jsx';
import { PomodoroProvider } from './context/PomodoroContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CalendarTodo from './pages/CalendarTodo.jsx';
import StudyHub from './pages/StudyHub.jsx';
import FocusZone from './pages/FocusZone.jsx';
import DiaryMood from './pages/DiaryMood.jsx';
import QuickNotes from './pages/QuickNotes.jsx';
import ExpenseTracker from './pages/ExpenseTracker.jsx';
import { AppBgSvg } from './assets/defaultSvgs.jsx';

function AppShell() {
  const [active, setActive] = useState('dashboard');
  const { openEditor } = useImages();

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-cozy-bg text-cozy-text">
      {/* Vị trí ảnh số 1: app_bg - Hình nền toàn ứng dụng */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <ImageSlot slotId="app_bg" defaultSvg={<AppBgSvg />} editable={false} className="h-full w-full" />
      </div>

      {/* Nút nổi góc phải dưới để đổi nhanh nền ứng dụng (app_bg) */}
      <button
        type="button"
        onClick={() => openEditor('app_bg')}
        title="Đổi hình nền ứng dụng (app_bg)"
        className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full border border-cozy-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-cozy-muted shadow-sm backdrop-blur transition hover:bg-white hover:text-cozy-text"
      >
        <Camera size={13} className="text-cozy-peach" /> Đổi nền app
      </button>

      <div className="relative z-10 flex h-full w-full">
        <Sidebar active={active} onNavigate={setActive} />
        <main className="cozy-scroll flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto max-w-6xl pb-10">
            <div className={active === 'dashboard' ? 'block' : 'hidden'}>
              <Dashboard onNavigate={setActive} />
            </div>
            <div className={active === 'calendar' ? 'block' : 'hidden'}>
              <CalendarTodo />
            </div>
            <div className={active === 'study' ? 'block' : 'hidden'}>
              <StudyHub />
            </div>
            {/* Luôn giữ FocusZone trong DOM (chỉ ẩn/hiện bằng CSS) để nhạc YouTube & Pomodoro không bao giờ bị ngắt khi chuyển tab */}
            <div className={active === 'focus' ? 'block' : 'hidden'}>
              <FocusZone />
            </div>
            <div className={active === 'diary' ? 'block' : 'hidden'}>
              <DiaryMood />
            </div>
            <div className={active === 'notes' ? 'block' : 'hidden'}>
              <QuickNotes />
            </div>
            <div className={active === 'expenses' ? 'block' : 'hidden'}>
              <ExpenseTracker />
            </div>
          </div>
        </main>
      </div>

      <ImageManager />
    </div>
  );
}

export default function App() {
  return (
    <ImageProvider>
      <PomodoroProvider>
        <AppShell />
      </PomodoroProvider>
    </ImageProvider>
  );
}
