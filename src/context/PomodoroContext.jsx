// Bộ đếm Pomodoro dùng chung toàn app (vẫn chạy khi chuyển sang khu vực khác)
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { playChime } from '../lib/utils.js';

const PomodoroContext = createContext(null);

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
  const [mode, setMode] = useState('work');
  const [status, setStatus] = useState('idle'); // idle | running | paused
  const [currentTrack, setCurrentTrack] = useState(null); // { title, videoId, emoji? }
  const [trackPlaying, setTrackPlaying] = useState(true);
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
  const durationFor = useCallback(
    (m) => {
      const fallback = { work: 25, short: 5, long: 15 }[m];
      return clampMinutes(config[MODE_META[m].configKey], fallback) * 60 * 1000;
    },
    [config]
  );
  const [remainingMs, setRemainingMs] = useState(() => durationFor('work'));
  const endAtRef = useRef(null);
  const stateRef = useRef({ mode, status });
  stateRef.current = { mode, status };

  // Khi đổi cài đặt thời lượng lúc đang rảnh -> cập nhật lại đồng hồ
  useEffect(() => {
    if (status === 'idle') setRemainingMs(durationFor(mode));
  }, [durationFor, mode, status]);

  const notify = (title, body) => {
    playChime();
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, silent: true });
      }
    } catch {
      /* bỏ qua */
    }
  };

  const complete = useCallback((countSession = true) => {
    const { mode: m } = stateRef.current;
    endAtRef.current = null;
    if (m === 'work') {
      let nextCount = config.completedSessions || 0;
      if (countSession) {
        setConfig((prev) => {
          nextCount = (prev.completedSessions || 0) + 1;
          return { ...prev, completedSessions: nextCount };
        });
      }
      const next = countSession && nextCount % 4 === 0 ? 'long' : 'short';
      setMode(next);
      setRemainingMs(durationFor(next));
      if (countSession) notify('Hoàn thành phiên tập trung! 🎉', 'Nghỉ ngơi một chút nhé, bạn làm tốt lắm!');
    } else {
      setMode('work');
      setRemainingMs(durationFor('work'));
      if (countSession) notify('Hết giờ nghỉ rồi 🌸', 'Sẵn sàng cho phiên tập trung tiếp theo nào!');
    }
    setStatus('idle');
  }, [durationFor, setConfig, config.completedSessions]);

  // Vòng đếm chính - tính theo mốc thời gian thực nên không bị lệch khi tab ẩn
  useEffect(() => {
    if (status !== 'running') return undefined;
    const tick = () => {
      if (!endAtRef.current) return;
      const left = endAtRef.current - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        complete();
      } else {
        setRemainingMs(left);
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
    endAtRef.current = Date.now() + remainingMs;
    setStatus('running');
  }, [remainingMs]);

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

  const selectTrack = useCallback((track) => {
    setCurrentTrack(track);
    setTrackPlaying(Boolean(track));
  }, []);

  const stopTrack = useCallback(() => {
    setCurrentTrack(null);
    setTrackPlaying(false);
  }, []);

  const value = useMemo(
    () => ({
      config,
      setConfig,
      mode,
      status,
      remainingMs,
      totalMs: durationFor(mode),
      isBreak: mode !== 'work',
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
      ytIframeRef,
    }),
    [
      config,
      setConfig,
      mode,
      status,
      remainingMs,
      durationFor,
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
    ]
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro phải được dùng bên trong <PomodoroProvider>');
  return ctx;
}

export const formatClock = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
