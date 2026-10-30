// ============================================================
// CẤU TRÚC DỮ LIỆU CỐ ĐỊNH - PROJECT_RULES.md mục II
// TUYỆT ĐỐI KHÔNG đổi tên các Key dưới đây giữa các lần sửa code.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';

export const STORAGE_KEYS = {
  CUSTOM_IMAGES: 'cozy_custom_images', // { [slotId]: string }
  TODOS: 'cozy_todos', // Array<{ id, title, date, priority, category, completed }>
  SUBJECTS: 'cozy_subjects', // Array<{ id, name, color, coverSlotId, createdAt }>
  STUDY_MATERIALS: 'cozy_study_materials', // Array<{ id, subjectId, title, content, type, updatedAt }>
  STUDY_SETS: 'cozy_study_sets', // Array<{ id, subjectId, flashcards, quizzes }>
  FOCUS_CONFIG: 'cozy_focus_config', // { pomodoroWork, pomodoroShort, pomodoroLong, completedSessions, youtubeLinks }
  DIARY_ENTRIES: 'cozy_diary_entries', // Array<{ id, date, mood, title, content, paperColor, photos }>
  STICKY_NOTES: 'cozy_sticky_notes', // Array<{ id, content, color, isPinned, updatedAt }>
  EXPENSES: 'cozy_expenses', // { monthlyBudget, transactions }
};

export const DEFAULT_FOCUS_CONFIG = {
  pomodoroWork: 25,
  pomodoroShort: 5,
  pomodoroLong: 15,
  completedSessions: 0,
  youtubeLinks: [],
};

export const DEFAULT_EXPENSES = {
  monthlyBudget: 0,
  transactions: [],
};

export const DEFAULTS = {
  [STORAGE_KEYS.CUSTOM_IMAGES]: {},
  [STORAGE_KEYS.TODOS]: [],
  [STORAGE_KEYS.SUBJECTS]: [],
  [STORAGE_KEYS.STUDY_MATERIALS]: [],
  [STORAGE_KEYS.STUDY_SETS]: [],
  [STORAGE_KEYS.FOCUS_CONFIG]: DEFAULT_FOCUS_CONFIG,
  [STORAGE_KEYS.DIARY_ENTRIES]: [],
  [STORAGE_KEYS.STICKY_NOTES]: [],
  [STORAGE_KEYS.EXPENSES]: DEFAULT_EXPENSES,
};

const SYNC_EVENT = 'cozy-storage-sync';

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Đọc an toàn 1 key, nếu hỏng/thiếu thì trả về giá trị mặc định (gộp field thiếu với object). */
export function readStorage(key, fallback = DEFAULTS[key]) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
    if (isPlainObject(fallback)) return isPlainObject(parsed) ? { ...fallback, ...parsed } : fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

/** Ghi 1 key. Trả về true/false; báo lỗi thân thiện khi đầy bộ nhớ (thường do ảnh Base64 quá lớn). */
export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
    return true;
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      window.alert(
        'Bộ nhớ của CozySpace đã đầy 🥺\nHãy thử dùng ảnh nhỏ hơn, dán URL ảnh thay vì tải lên, hoặc khôi phục bớt ảnh gốc.'
      );
    } else {
      console.error('[CozySpace] Lỗi ghi localStorage', err);
    }
    return false;
  }
}

/**
 * Hook dùng chung cho MỌI module: tự động đọc/ghi localStorage theo key chuẩn,
 * đồng bộ tức thì giữa các component cùng dùng 1 key (vd: Dashboard & Lịch cùng đọc cozy_todos).
 */
export function useCozyStorage(key) {
  const [value, setValue] = useState(() => readStorage(key));
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const onSync = (e) => {
      if (e.type === 'storage' && e.key !== key) return;
      if (e.type === SYNC_EVENT && e.detail?.key !== key) return;
      setValue(readStorage(key));
    };
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener('storage', onSync); // đồng bộ giữa nhiều cửa sổ
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener('storage', onSync);
    };
  }, [key]);

  const update = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(valueRef.current) : next;
      valueRef.current = resolved;
      setValue(resolved);
      writeStorage(key, resolved);
    },
    [key]
  );

  return [value, update];
}

/** Ước tính dung lượng localStorage CozySpace đang dùng (KB). */
export function estimateStorageKB() {
  let total = 0;
  Object.values(STORAGE_KEYS).forEach((k) => {
    const raw = window.localStorage.getItem(k);
    if (raw) total += raw.length * 2; // UTF-16
  });
  return Math.round(total / 1024);
}

