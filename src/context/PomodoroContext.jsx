// Bộ đếm Pomodoro + Trình phát nhạc nền + Âm thanh trắng Offline dùng chung toàn app
// Tách 2 Context (State ổn định vs Clock 1s/lần) để không gây re-render thừa trên các trang
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { ambientMixer, playChime, todayISO } from '../lib/utils.js';
import { useToast } from '../components/Toast.jsx';

const PomodoroStateContext = createContext(null);
const PomodoroClockContext = createContext(null);

export const MODE_META = {
  work: { label: 'Tập trung', emoji: '📚', configKey: 'pomodoroWork' },
  short: { label: 'Nghỉ ngắn', emoji: '🍵', configKey: 'pomodoroShort' },
  long: { label: 'Nghỉ dài', emoji: '🌙', configKey: 'pomodoroLong' },
};

const clampMinutes = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 180) : fallback;
};

export function PomodoroProvider({ children }) {
  const [config, setConfig] = useCozyStorage(STORAGE_KEYS.FOCUS_CONFIG);
  const [settings] = useCozyStorage(STORAGE_KEYS.SETTINGS);
  const { toast, celebrate } = useToast();

  const [mode, setMode] = useState('work');
  const [status, setStatus] = useState('idle'); // idle | running | paused
  const [focusTarget, setFocusTarget] = useState(null); // { type: 'todo'|'subject', id, title } | null
  const [currentTrack, setCurrentTrack] = useState(null); // { title, videoId, emoji? }
  const [trackPlaying, setTrackPlaying] = useState(false);
  const [ambientVolumes, setAmbientVolumes] = useState({ rain: 0, fire: 0, waves: 0, cafe: 0 });
  const ytIframeRef = useRef(null);

  const sendYouTubeCommand = useCallback((func, args = []) => {
    try {
      const win = ytIframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    } catch {
      /* bỏ qua nếu iframe chưa tải xong */
    }
  }, []);

  const toggleTrackPlayback = useCallback(() => {
    setTrackPlaying((prev) => {
      const next = !prev;
      sendYouTubeCommand(next ? 'playVideo' : 'pauseVideo');
      return next;
    });
  }, [sendYouTubeCommand]);

  // Lắng nghe sự kiện trạng thái 2 chiều từ YouTube IFrame API
  useEffect(() => {
    const onMessage = (e) => {
      if (!String(e.origin || '').includes('youtube')) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'infoDelivery' && data.info && typeof data.info.playerState === 'number') {
          if (data.info.playerState === 1) setTrackPlaying(true);
          else if (data.info.playerState === 2 || data.info.playerState === 0) setTrackPlaying(false);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const setAmbientVolume = useCallback((soundId, vol) => {
    const clean = Math.max(0, Math.min(1, Number(vol) || 0));
    ambientMixer.setVolume(soundId, clean);
    setAmbientVolumes((prev) => ({ ...prev, [soundId]: clean }));
  }, []);

  const stopAllAmbient = useCallback(() => {
    ambientMixer.stopAll();
    setAmbientVolumes({ rain: 0, fire: 0, waves: 0, cafe: 0 });
  }, []);

  const hasActiveAmbient = useMemo(
    () => Object.values(ambientVolumes).some((v) => v > 0.01),
    [ambientVolumes]
  );

  const durationFor = useCallback(
    (m) => {
      const fallback = { work: 25, short: 5, long: 15 }[m];
      return clampMinutes(config[MODE_META[m].configKey], fallback) * 60 * 1000;
    },
    [config]
  );

  const [remainingMs, setRemainingMs] = useState(() => durationFor('work'));
  const remainingRef = useRef(remainingMs);
  remainingRef.current = remainingMs;
  const endAtRef = useRef(null);
  const stateRef = useRef({ mode, status, config, focusTarget });
  stateRef.current = { mode, status, config, focusTarget };

  useEffect(() => {
    if (status === 'idle') setRemainingMs(durationFor(mode));
  }, [durationFor, mode, status]);

  const notify = useCallback(
    (title, body) => {
      playChime();
      toast({ message: `${title} — ${body}`, tone: 'info' });
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, silent: true });
        }
      } catch {
        /* bỏ qua */
      }
    },
    [toast]
  );

  const complete = useCallback(
    (countSession = true) => {
      const { mode: m, config: curCfg, focusTarget: target } = stateRef.current;
      endAtRef.current = null;

      if (m === 'work') {
        const workMins = clampMinutes(curCfg.pomodoroWork, 25);
        const nextCount = countSession ? (curCfg.completedSessions || 0) + 1 : curCfg.completedSessions || 0;

        if (countSession) {
          const today = todayISO();
          setConfig((prev) => {
            const history = { ...(prev.dailyHistory || {}) };
            const prevDay = history[today] || { sessions: 0, minutes: 0 };
            history[today] = {
              sessions: prevDay.sessions + 1,
              minutes: prevDay.minutes + workMins,
            };
            return {
              ...prev,
              completedSessions: (prev.completedSessions || 0) + 1,
              dailyHistory: history,
            };
          });
        }

        const nextMode = countSession && nextCount > 0 && nextCount % 4 === 0 ? 'long' : 'short';
        const nextDuration = durationFor(nextMode);
        setMode(nextMode);
        setRemainingMs(nextDuration);

        if (countSession) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('cozy-companion-celebrate', {
                detail: {
                  type: 'pomodoro',
                  message: 'Hoàn thành phiên tập trung trọn vẹn! Nghỉ ngơi chút nhé~',
                },
              })
            );
          }
          if (nextCount % 4 === 0) {
            celebrate(`Hoàn thành chu kỳ ${nextCount} phiên Pomodoro! Nghỉ dài thôi 🎉`);
          } else {
            notify(
              'Hoàn thành phiên tập trung! 🎉',
              target ? `Đã tập trung xong cho "${target.title}". Nghỉ ngơi chút nhé!` : 'Nghỉ ngơi một chút nhé, bạn làm tốt lắm!'
            );
          }
        }

        if (countSession && curCfg.autoStartBreak) {
          endAtRef.current = Date.now() + nextDuration;
          setStatus('running');
        } else {
          setStatus('idle');
        }
      } else {
        const nextDuration = durationFor('work');
        setMode('work');
        setRemainingMs(nextDuration);
        if (countSession) notify('Hết giờ nghỉ rồi 🌸', 'Sẵn sàng cho phiên tập trung tiếp theo nào!');

        if (countSession && curCfg.autoStartWork) {
          endAtRef.current = Date.now() + nextDuration;
          setStatus('running');
        } else {
          setStatus('idle');
        }
      }
    },
    [durationFor, setConfig, notify, celebrate]
  );

  // Vòng đếm chính: chỉ cập nhật state khi số giây thực sự thay đổi (tối đa 1 lần/giây!)
  useEffect(() => {
    if (status !== 'running') return undefined;
    const tick = () => {
      if (!endAtRef.current) return;
      const left = endAtRef.current - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        complete(true);
      } else {
        const prevSec = Math.ceil(remainingRef.current / 1000);
        const nextSec = Math.ceil(left / 1000);
        if (nextSec !== prevSec) {
          setRemainingMs(left);
        }
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status, complete]);

  // Hiển thị thời gian trên thanh tiêu đề cửa sổ
  useEffect(() => {
    if (status === 'idle') {
      document.title = 'CozySpace';
      return;
    }
    const s = Math.ceil(remainingMs / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    document.title = `${status === 'paused' ? '⏸' : MODE_META[mode].emoji} ${mm}:${ss} · CozySpace`;
  }, [remainingMs, status, mode]);

  const start = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    endAtRef.current = Date.now() + remainingRef.current;
    setStatus('running');
  }, []);

  const pause = useCallback(() => {
    if (endAtRef.current) setRemainingMs(Math.max(0, endAtRef.current - Date.now()));
    endAtRef.current = null;
    setStatus('paused');
  }, []);

  const reset = useCallback(() => {
    endAtRef.current = null;
    setStatus('idle');
    setRemainingMs(durationFor(stateRef.current.mode));
  }, [durationFor]);

  const switchMode = useCallback(
    (m) => {
      endAtRef.current = null;
      setMode(m);
      setStatus('idle');
      setRemainingMs(durationFor(m));
    },
    [durationFor]
  );

  const skip = useCallback(() => complete(false), [complete]);

  /** Gắn 1 đầu việc hoặc môn học vào Pomodoro & bắt đầu đếm giờ ngay */
  const startFocusOn = useCallback(
    (target) => {
      setFocusTarget(target);
      if (stateRef.current.mode !== 'work') {
        const workMs = durationFor('work');
        setMode('work');
        setRemainingMs(workMs);
        remainingRef.current = workMs;
      }
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      endAtRef.current = Date.now() + remainingRef.current;
      setStatus('running');
    },
    [durationFor]
  );

  const selectTrack = useCallback((track) => {
    setCurrentTrack(track);
    setTrackPlaying(Boolean(track));
  }, []);

  const stopTrack = useCallback(() => {
    setCurrentTrack(null);
    setTrackPlaying(false);
  }, []);

  // Đồng bộ hành vi đóng cửa sổ với System Tray của Electron
  useEffect(() => {
    const activeBackground = status === 'running' || (Boolean(currentTrack) && trackPlaying) || hasActiveAmbient;
    window.cozyEnv?.setCloseBehavior?.({
      mode: settings?.closeToTray || 'smart',
      activeBackground,
    });
  }, [status, currentTrack, trackPlaying, hasActiveAmbient, settings?.closeToTray]);

  // Lắng nghe lệnh điều khiển nhanh từ menu chuột phải System Tray
  useEffect(() => {
    if (typeof window.cozyEnv?.onTrayAction !== 'function') return undefined;
    return window.cozyEnv.onTrayAction((action) => {
      if (action === 'toggle-pomodoro') {
        if (stateRef.current.status === 'running') pause();
        else start();
      } else if (action === 'toggle-music') {
        if (currentTrack) toggleTrackPlayback();
      }
    });
  }, [pause, start, currentTrack, toggleTrackPlayback]);

  const stateValue = useMemo(
    () => ({
      config,
      setConfig,
      mode,
      status,
      isBreak: mode !== 'work',
      focusTarget,
      setFocusTarget,
      startFocusOn,
      start,
      pause,
      reset,
      skip,
      switchMode,
      currentTrack,
      trackPlaying,
      setTrackPlaying,
      selectTrack,
      stopTrack,
      toggleTrackPlayback,
      ambientVolumes,
      setAmbientVolume,
      stopAllAmbient,
      hasActiveAmbient,
      ytIframeRef,
    }),
    [
      config,
      setConfig,
      mode,
      status,
      focusTarget,
      startFocusOn,
      start,
      pause,
      reset,
      skip,
      switchMode,
      currentTrack,
      trackPlaying,
      selectTrack,
      stopTrack,
      toggleTrackPlayback,
      ambientVolumes,
      setAmbientVolume,
      stopAllAmbient,
      hasActiveAmbient,
    ]
  );

  const clockValue = useMemo(
    () => ({
      remainingMs,
      totalMs: durationFor(mode),
    }),
    [remainingMs, durationFor, mode]
  );

  return (
    <PomodoroStateContext.Provider value={stateValue}>
      <PomodoroClockContext.Provider value={clockValue}>{children}</PomodoroClockContext.Provider>
    </PomodoroStateContext.Provider>
  );
}

/** Chỉ đọc trạng thái & hành động ổn định (KHÔNG re-render mỗi giây khi đồng hồ đếm) */
export function usePomodoroState() {
  const ctx = useContext(PomodoroStateContext);
  if (!ctx) throw new Error('usePomodoroState phải được dùng bên trong <PomodoroProvider>');
  return ctx;
}

/** Chỉ đọc đồng hồ đếm ngược 1s/lần */
export function usePomodoroClock() {
  const ctx = useContext(PomodoroClockContext);
  if (!ctx) throw new Error('usePomodoroClock phải được dùng bên trong <PomodoroProvider>');
  return ctx;
}

/** Hook đầy đủ tương thích ngược */
export function usePomodoro() {
  const state = usePomodoroState();
  const clock = usePomodoroClock();
  return useMemo(() => ({ ...state, ...clock }), [state, clock]);
}

export const formatClock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
