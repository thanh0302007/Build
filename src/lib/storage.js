// ============================================================
// HỆ THỐNG LƯU TRỮ DỮ LIỆU COZYSPACE DESKTOP (v2)
// - Trên Electron: Lưu trực tiếp xuống ổ cứng máy tính (`CozySpaceData/db.json` + `media/` + `backups/`)
// - Trên Web Preview: Tự động dùng bộ nhớ đệm + `localStorage` có debounce
// - Đồng bộ tức thì O(1) qua RAM giữa mọi phân khu mà không tốn JSON.parse mỗi lần gõ phím
// ============================================================
import { useCallback, useEffect, useId, useRef, useState } from 'react';

export const STORAGE_KEYS = {
  CUSTOM_IMAGES: 'cozy_custom_images', // { [slotId]: string (cozy-media:// | https:// | data:) }
  TODOS: 'cozy_todos', // Array<{ id, title, date, time?, repeat?, subtasks?, priority, category, completed }>
  SUBJECTS: 'cozy_subjects', // Array<{ id, name, color, coverSlotId, createdAt }>
  STUDY_MATERIALS: 'cozy_study_materials', // Array<{ id, subjectId, title, content, type, createdAt, updatedAt }>
  STUDY_SETS: 'cozy_study_sets', // Array<{ id, subjectId, flashcards, quizzes, bestQuizScore?, lastQuizAt? }>
  FOCUS_CONFIG: 'cozy_focus_config', // { pomodoroWork, pomodoroShort, pomodoroLong, autoStartBreak, autoStartWork, completedSessions, dailyHistory, youtubeLinks }
  DIARY_ENTRIES: 'cozy_diary_entries', // Array<{ id, date, mood, title, content, paperColor, photos }>
  DIARY_DRAFT: 'cozy_diary_draft', // { date, mood, title, content, paperColor, photos } | null
  STICKY_NOTES: 'cozy_sticky_notes', // Array<{ id, content, checklist?, mode?, color, isPinned, updatedAt }>
  EXPENSES: 'cozy_expenses', // { monthlyBudget, monthlyBudgets, transactions }
  SETTINGS: 'cozy_settings', // { userName, userTagline, theme, warmDimmer, soundEnabled, sidebarCollapsed, closeToTray, diaryPin }
};

export const DEFAULT_FOCUS_CONFIG = {
  pomodoroWork: 25,
  pomodoroShort: 5,
  pomodoroLong: 15,
  autoStartBreak: false,
  autoStartWork: false,
  completedSessions: 0,
  dailyHistory: {}, // { 'YYYY-MM-DD': { sessions: number, minutes: number } }
  youtubeLinks: [],
};

export const DEFAULT_EXPENSES = {
  monthlyBudget: 0,
  monthlyBudgets: {}, // { 'YYYY-MM': number }
  baseBalance: 0, // Số dư gốc ban đầu (Toàn bộ số dư = baseBalance + tổng thu - tổng chi)
  funds: undefined, // Array<{ id, name, emoji, color, allocated }> — khởi tạo mặc định thông minh ở Sổ thu chi
  plannedExpenses: [], // Array<{ id, month, title, amount, category, fundId, dueDate, paid, paidTxId }>
  transactions: [], // Array<{ id, amount, type, category, fundId?, note, date }>
};

export const DEFAULT_SETTINGS = {
  userName: 'Cozy Friend',
  userTagline: 'Mỗi ngày tiến bộ một chút',
  theme: 'sakura-cream', // 'sakura-cream' | 'botanical-matcha' | 'vintage-cafe' | 'midnight-lofi'
  warmDimmer: 0, // 0..35 (%)
  soundEnabled: true,
  sidebarCollapsed: false,
  closeToTray: 'smart', // 'smart' | 'always' | 'off'
  diaryPin: '',
};

export const DEFAULTS = {
  [STORAGE_KEYS.CUSTOM_IMAGES]: {},
  [STORAGE_KEYS.TODOS]: [],
  [STORAGE_KEYS.SUBJECTS]: [],
  [STORAGE_KEYS.STUDY_MATERIALS]: [],
  [STORAGE_KEYS.STUDY_SETS]: [],
  [STORAGE_KEYS.FOCUS_CONFIG]: DEFAULT_FOCUS_CONFIG,
  [STORAGE_KEYS.DIARY_ENTRIES]: [],
  [STORAGE_KEYS.DIARY_DRAFT]: null,
  [STORAGE_KEYS.STICKY_NOTES]: [],
  [STORAGE_KEYS.EXPENSES]: DEFAULT_EXPENSES,
  [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
};

const SYNC_EVENT = 'cozy-storage-sync';
const isElectron = Boolean(typeof window !== 'undefined' && window.cozyEnv?.isElectron);

const memoryStore = new Map();
const pendingTimers = new Map();
let initialized = false;
let diskDataDir = '';

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function mergeWithFallback(parsed, fallback) {
  if (parsed === undefined || parsed === null) return fallback;
  if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
  if (isPlainObject(fallback)) return isPlainObject(parsed) ? { ...fallback, ...parsed } : fallback;
  return parsed;
}

function ensureInitialized() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  if (isElectron && typeof window.cozyEnv?.initDbSync === 'function') {
    try {
      const initPayload = window.cozyEnv.initDbSync();
      diskDataDir = initPayload?.dataDir || '';
      const diskKeys = initPayload?.keys || {};
      for (const [k, v] of Object.entries(diskKeys)) {
        memoryStore.set(k, v);
      }

      // Tự động di chuyển dữ liệu cũ từ localStorage sang ổ cứng nếu có
      const legacyToMigrate = {};
      let hasLegacy = false;
      Object.values(STORAGE_KEYS).forEach((k) => {
        if (memoryStore.has(k)) return;
        try {
          const raw = window.localStorage.getItem(k);
          if (raw != null) {
            const parsed = JSON.parse(raw);
            memoryStore.set(k, parsed);
            legacyToMigrate[k] = parsed;
            hasLegacy = true;
          }
        } catch {
          /* bỏ qua */
        }
      });

      if (hasLegacy && typeof window.cozyEnv.migrateLegacyDb === 'function') {
        window.cozyEnv.migrateLegacyDb(legacyToMigrate).then((res) => {
          if (res?.ok && res.keys) {
            for (const [k, v] of Object.entries(res.keys)) {
              memoryStore.set(k, v);
            }
            window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key: '*' } }));
          }
        });
      }
    } catch (err) {
      console.error('[CozySpace] Lỗi nạp dữ liệu ổ cứng:', err);
    }
  } else {
    // Môi trường trình duyệt Web
    Object.values(STORAGE_KEYS).forEach((k) => {
      try {
        const raw = window.localStorage.getItem(k);
        if (raw != null) memoryStore.set(k, JSON.parse(raw));
      } catch {
        /* ignore */
      }
    });
  }
}

export function getDiskDataDir() {
  ensureInitialized();
  return diskDataDir;
}

/** Đọc an toàn 1 key trực tiếp từ bộ nhớ đệm đã đồng bộ với ổ cứng */
export function readStorage(key, fallback = DEFAULTS[key]) {
  ensureInitialized();
  if (!memoryStore.has(key)) return fallback;
  return mergeWithFallback(memoryStore.get(key), fallback);
}

function persistKeyNow(key, value) {
  if (isElectron && typeof window.cozyEnv?.writeDbKey === 'function') {
    window.cozyEnv.writeDbKey(key, value).then((res) => {
      if (res?.ok && res.normalizedChanged && res.normalized !== undefined) {
        // Nếu chuỗi Base64 mới được tách thành file thật `cozy-media://`, cập nhật nhẹ lại RAM
        if (memoryStore.get(key) === value) {
          memoryStore.set(key, res.normalized);
          window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
        }
      }
    });
    return true;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('[CozySpace] Lỗi ghi localStorage:', err);
    return false;
  }
}

/** Ghi 1 key: cập nhật RAM tức thì + lưu xuống ổ cứng có debounce 180ms */
export function writeStorage(key, value, senderId = null) {
  ensureInitialized();
  memoryStore.set(key, value);
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key, senderId } }));

  if (pendingTimers.has(key)) {
    clearTimeout(pendingTimers.get(key));
  }
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      persistKeyNow(key, memoryStore.get(key));
    }, 180)
  );
  return true;
}

/** Ép ghi toàn bộ các thay đổi đang chờ xuống đĩa ngay lập tức */
export function flushAllStorage() {
  for (const [key, timer] of pendingTimers.entries()) {
    clearTimeout(timer);
    pendingTimers.delete(key);
    persistKeyNow(key, memoryStore.get(key));
  }
  if (isElectron && typeof window.cozyEnv?.flushDb === 'function') {
    window.cozyEnv.flushDb();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushAllStorage);
}

/** Nạp lại toàn bộ dữ liệu vào RAM (sau khi Khôi phục sao lưu hoặc Đổi thư mục ổ cứng) */
export function hydrateStorageMap(newKeysMap = {}, persistToLocalIfWeb = false) {
  ensureInitialized();
  memoryStore.clear();
  for (const [k, v] of Object.entries(newKeysMap || {})) {
    memoryStore.set(k, v);
    if (persistToLocalIfWeb && !isElectron) {
      try {
        window.localStorage.setItem(k, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    }
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key: '*' } }));
}

/** Xuất toàn bộ dữ liệu hiện tại thành Object để tải về (dự phòng cho môi trường Web) */
export function exportAllKeysSnapshot() {
  ensureInitialized();
  const keys = {};
  Object.values(STORAGE_KEYS).forEach((k) => {
    keys[k] = readStorage(k);
  });
  return {
    format: 'cozyspace-backup-v2',
    exportedAt: new Date().toISOString(),
    keys,
  };
}

/** Hook dùng chung cho mọi phân khu — đồng bộ tức thì, không parse lại ở chính nơi vừa ghi */
export function useCozyStorage(key) {
  const hookId = useId();
  const [value, setValue] = useState(() => readStorage(key));
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const onSync = (e) => {
      if (e.type === 'storage') {
        if (e.key && e.key !== key) return;
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : DEFAULTS[key];
          memoryStore.set(key, parsed);
          setValue(mergeWithFallback(parsed, DEFAULTS[key]));
        } catch {
          /* ignore */
        }
        return;
      }
      if (e.type === SYNC_EVENT) {
        const detail = e.detail || {};
        if (detail.senderId && detail.senderId === hookId) return;
        if (detail.key !== '*' && detail.key !== key) return;
        const nextVal = readStorage(key);
        valueRef.current = nextVal;
        setValue(nextVal);
      }
    };
    window.addEventListener(SYNC_EVENT, onSync);
    if (!isElectron) window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      if (!isElectron) window.removeEventListener('storage', onSync);
    };
  }, [key, hookId]);

  const update = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(valueRef.current) : next;
      valueRef.current = resolved;
      setValue(resolved);
      writeStorage(key, resolved, hookId);
    },
    [key, hookId]
  );

  return [value, update];
}

/** Ước tính dung lượng dữ liệu JSON trong RAM (KB) */
export function estimateStorageKB() {
  ensureInitialized();
  let total = 0;
  Object.values(STORAGE_KEYS).forEach((k) => {
    const v = memoryStore.get(k);
    if (v !== undefined) {
      try {
        total += JSON.stringify(v).length * 2;
      } catch {
        /* ignore */
      }
    }
  });
  return Math.round(total / 1024);
}
