// Bảng lệnh & Tìm kiếm nhanh toàn cục (Ctrl + K) — hỗ trợ tìm tiếng Việt không dấu
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Home,
  CalendarCheck,
  BookOpen,
  Headphones,
  NotebookPen,
  StickyNote,
  Wallet,
  Play,
  Pause,
  Settings,
  Images,
  FolderOpen,
  CloudRain,
  ArrowRight,
} from 'lucide-react';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { usePomodoroState } from '../context/PomodoroContext.jsx';
import { useImages } from './ImageSlot.jsx';
import { formatVND } from '../lib/utils.js';
import { cx } from './ui.jsx';

const foldVietnamese = (str = '') =>
  String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export default function CommandPalette({ open, onClose, onNavigate, onOpenSettings }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const [todos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const [subjects] = useCozyStorage(STORAGE_KEYS.SUBJECTS);
  const [materials] = useCozyStorage(STORAGE_KEYS.STUDY_MATERIALS);
  const [diaryEntries] = useCozyStorage(STORAGE_KEYS.DIARY_ENTRIES);
  const [notes] = useCozyStorage(STORAGE_KEYS.STICKY_NOTES);
  const [expenses] = useCozyStorage(STORAGE_KEYS.EXPENSES);

  const pomo = usePomodoroState();
  const { openManager } = useImages();

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const items = useMemo(() => {
    const baseActions = [
      { id: 'nav-dashboard', group: 'Đi tới phân khu', icon: Home, label: 'Trang chủ Dashboard', sub: 'Ctrl + 1', run: () => onNavigate('dashboard') },
      { id: 'nav-calendar', group: 'Đi tới phân khu', icon: CalendarCheck, label: 'Lịch & Việc cần làm (To-do)', sub: 'Ctrl + 2', run: () => onNavigate('calendar') },
      { id: 'nav-study', group: 'Đi tới phân khu', icon: BookOpen, label: 'Học tập + Gemini', sub: 'Ctrl + 3', run: () => onNavigate('study') },
      { id: 'nav-focus', group: 'Đi tới phân khu', icon: Headphones, label: 'Góc Tập trung & Nhạc nền', sub: 'Ctrl + 4', run: () => onNavigate('focus') },
      { id: 'nav-diary', group: 'Đi tới phân khu', icon: NotebookPen, label: 'Nhật ký & Cảm xúc', sub: 'Ctrl + 5', run: () => onNavigate('diary') },
      { id: 'nav-notes', group: 'Đi tới phân khu', icon: StickyNote, label: 'Ghi chú nhanh (Sticky Notes)', sub: 'Ctrl + 6', run: () => onNavigate('notes') },
      { id: 'nav-expenses', group: 'Đi tới phân khu', icon: Wallet, label: 'Sổ thu chi & Ngân sách', sub: 'Ctrl + 7', run: () => onNavigate('expenses') },
      {
        id: 'act-pomo',
        group: 'Lệnh nhanh',
        icon: pomo.status === 'running' ? Pause : Play,
        label: pomo.status === 'running' ? 'Tạm dừng đồng hồ Pomodoro' : 'Bắt đầu phiên tập trung Pomodoro',
        sub: 'Pomodoro',
        run: () => (pomo.status === 'running' ? pomo.pause() : pomo.start()),
      },
      {
        id: 'act-rain',
        group: 'Lệnh nhanh',
        icon: CloudRain,
        label: pomo.ambientVolumes.rain > 0 ? 'Tắt tiếng mưa rơi Offline' : 'Bật tiếng mưa rơi thư giãn (Offline)',
        sub: 'Âm thanh nền',
        run: () => pomo.setAmbientVolume('rain', pomo.ambientVolumes.rain > 0 ? 0 : 0.55),
      },
      {
        id: 'act-images',
        group: 'Lệnh nhanh',
        icon: Images,
        label: 'Mở Kho ảnh (Tùy chỉnh 9 vị trí ảnh)',
        sub: 'Hình ảnh',
        run: () => openManager(),
      },
      {
        id: 'act-settings',
        group: 'Lệnh nhanh',
        icon: Settings,
        label: 'Mở Cài đặt, Chủ đề & Sao lưu ổ cứng',
        sub: 'Ctrl + ,',
        run: () => onOpenSettings(),
      },
    ];

    if (window.cozyEnv?.isElectron) {
      baseActions.push({
        id: 'act-folder',
        group: 'Lệnh nhanh',
        icon: FolderOpen,
        label: 'Mở thư mục dữ liệu CozySpace trong File Explorer',
        sub: 'Ổ cứng',
        run: () => window.cozyEnv.openDataFolder(),
      });
    }

    const q = foldVietnamese(query.trim());
    if (!q) return baseActions;

    const results = baseActions.filter(
      (a) => foldVietnamese(a.label).includes(q) || foldVietnamese(a.group).includes(q)
    );

    todos.forEach((t) => {
      if (foldVietnamese(t.title).includes(q) || foldVietnamese(t.category).includes(q)) {
        results.push({
          id: `todo-${t.id}`,
          group: 'Việc cần làm',
          icon: CalendarCheck,
          label: `${t.completed ? '✓ ' : ''}${t.title}`,
          sub: `${t.date} · ${t.category || ''}`,
          run: () => onNavigate('calendar'),
        });
      }
    });

    subjects.forEach((s) => {
      if (foldVietnamese(s.name).includes(q)) {
        results.push({
          id: `subj-${s.id}`,
          group: 'Môn học',
          icon: BookOpen,
          label: s.name,
          sub: 'Mở sổ tay môn học',
          run: () => {
            window.__cozyPendingSubject = { subjectId: s.id };
            window.dispatchEvent(new CustomEvent('cozy-open-subject', { detail: { subjectId: s.id } }));
            onNavigate('study');
          },
        });
      }
    });

    materials.forEach((m) => {
      if (foldVietnamese(m.title).includes(q) || foldVietnamese(m.content).includes(q)) {
        results.push({
          id: `mat-${m.id}`,
          group: 'Tài liệu học tập',
          icon: BookOpen,
          label: m.title,
          sub: 'Đi tới bài học',
          run: () => {
            window.__cozyPendingSubject = { subjectId: m.subjectId, materialId: m.id };
            window.dispatchEvent(
              new CustomEvent('cozy-open-subject', {
                detail: { subjectId: m.subjectId, materialId: m.id },
              })
            );
            onNavigate('study');
          },
        });
      }
    });

    diaryEntries.forEach((e) => {
      if (foldVietnamese(e.title).includes(q) || foldVietnamese(e.content).includes(q)) {
        results.push({
          id: `diary-${e.id}`,
          group: 'Nhật ký',
          icon: NotebookPen,
          label: e.title,
          sub: e.date,
          run: () => onNavigate('diary'),
        });
      }
    });

    notes.forEach((n) => {
      const checklistText = (n.checklist || []).map((c) => c.text).join(' ');
      if (foldVietnamese(n.content).includes(q) || foldVietnamese(checklistText).includes(q)) {
        results.push({
          id: `note-${n.id}`,
          group: 'Ghi chú nhanh',
          icon: StickyNote,
          label: (n.content || checklistText || '(Ghi chú)').slice(0, 65),
          sub: 'Sticky Note',
          run: () => onNavigate('notes'),
        });
      }
    });

    (expenses?.transactions || []).forEach((tx) => {
      if (foldVietnamese(tx.note).includes(q)) {
        results.push({
          id: `tx-${tx.id}`,
          group: 'Sổ thu chi',
          icon: Wallet,
          label: `${tx.note} (${tx.type === 'income' ? '+' : '-'}${formatVND(tx.amount)})`,
          sub: tx.date,
          run: () => onNavigate('expenses'),
        });
      }
    });

    return results.slice(0, 24);
  }, [query, todos, subjects, materials, diaryEntries, notes, expenses, pomo, openManager, onNavigate, onOpenSettings]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  if (!open) return null;

  const safeCursor = items.length ? Math.min(cursor, items.length - 1) : 0;

  const executeItem = (item) => {
    if (!item) return;
    onClose();
    item.run?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (items.length ? (c + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (items.length ? (c - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter' && items[safeCursor]) {
      e.preventDefault();
      executeItem(items[safeCursor]);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[115] flex items-start justify-center p-4 pt-[11vh]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm và bảng lệnh nhanh"
        onKeyDown={onKeyDown}
        className="relative flex max-h-[72vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-cozy-line bg-cozy-bg shadow-2xl animate-pop-in"
      >
        <div className="flex items-center gap-3 border-b border-cozy-line bg-cozy-card px-4 py-3.5">
          <Search size={18} className="shrink-0 text-cozy-peach" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm việc cần làm, tài liệu học, ghi chú, thu chi hoặc gõ lệnh..."
            className="w-full bg-transparent text-sm font-semibold text-cozy-text outline-none placeholder:text-cozy-muted/75"
          />
          <kbd className="rounded-lg border border-cozy-line bg-cozy-blush px-2 py-0.5 font-mono text-[11px] font-bold text-cozy-muted">
            ESC
          </kbd>
        </div>

        <div className="cozy-scroll flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-cozy-muted">
              Không tìm thấy kết quả phù hợp với &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((item, idx) => {
                const Icon = item.icon;
                const active = idx === safeCursor;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => executeItem(item)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm transition',
                        active ? 'bg-cozy-peach/25 text-cozy-text' : 'text-cozy-text hover:bg-cozy-blush'
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cozy-card border border-cozy-line text-cozy-text">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{item.label}</p>
                        <p className="truncate text-[11px] font-semibold text-cozy-muted">{item.group}</p>
                      </div>
                      {item.sub && (
                        <span className="shrink-0 rounded-lg bg-cozy-blush px-2 py-0.5 text-[11px] font-semibold text-cozy-muted">
                          {item.sub}
                        </span>
                      )}
                      {active && <ArrowRight size={14} className="shrink-0 text-cozy-accent" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-cozy-line bg-cozy-card/70 px-4 py-2 text-[11px] font-semibold text-cozy-muted">
          <span>↑↓ để chọn · Enter để mở</span>
          <span>Ctrl + K tìm nhanh mọi nơi</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
