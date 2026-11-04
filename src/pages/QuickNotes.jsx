// (5) Ghi chú nhanh - Sticky Notes (hỗ trợ Văn bản & Checklist tương tác, chuyển nhanh sang To-do / Học tập)
import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import {
  Plus,
  Pin,
  PinOff,
  Trash2,
  Palette,
  Search,
  Copy,
  CheckSquare,
  AlignLeft,
  CalendarPlus,
  BookMarked,
  Check,
  X,
  StickyNote,
} from 'lucide-react';
import { Button, Input, PageHeader, IconButton, cx } from '../components/ui.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { uid, todayISO, formatRelativeTime } from '../lib/utils.js';

// `color` trong cozy_sticky_notes lưu id màu dưới đây (được Dashboard import)
export const NOTE_COLORS = [
  { id: 'butter', label: 'Vàng bơ', bg: '#FFF3B0' },
  { id: 'peach', label: 'Hồng đào', bg: '#FBD3D9' },
  { id: 'matcha', label: 'Matcha', bg: '#D3E7D6' },
  { id: 'lavender', label: 'Oải hương', bg: '#E2D4F0' },
  { id: 'blush', label: 'Hồng phấn', bg: '#FFF9F9' },
  { id: 'milk', label: 'Trắng sữa', bg: '#FFFFFF' },
];

const colorOf = (id) => NOTE_COLORS.find((c) => c.id === id)?.bg || id || '#FFF3B0';

const tiltOf = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 5) - 2) * 0.55; // -1.1deg .. 1.1deg
};

function textToChecklist(text = '') {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [{ id: uid(), text: '', done: false }];
  return lines.map((line) => {
    const doneMatch = line.match(/^\[[xX✓]\]\s*(.*)$/);
    const todoMatch = line.match(/^(?:\[\s?\]|[-*•])\s*(.*)$/);
    if (doneMatch) return { id: uid(), text: doneMatch[1], done: true };
    if (todoMatch) return { id: uid(), text: todoMatch[1], done: false };
    return { id: uid(), text: line, done: false };
  });
}

function checklistToText(items = []) {
  return items
    .map((i) => (i.text || '').trim())
    .filter(Boolean)
    .join('\n');
}

function NoteCard({
  note,
  autoFocus,
  onPatch,
  onTogglePin,
  onDelete,
  onDuplicate,
  onConvertToTodo,
  onSaveToStudy,
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const textareaRef = useRef(null);
  const isChecklist = note.mode === 'checklist';
  const checklist = Array.isArray(note.checklist) ? note.checklist : [];

  useEffect(() => {
    if (autoFocus && textareaRef.current) textareaRef.current.focus();
  }, [autoFocus]);

  // Tự giãn chiều cao mượt trên mọi trình duyệt / Electron
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el || isChecklist) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(112, el.scrollHeight)}px`;
  }, [note.content, isChecklist]);

  const toggleMode = () => {
    if (isChecklist) {
      onPatch(note.id, {
        mode: 'text',
        content: checklistToText(checklist),
      });
    } else {
      onPatch(note.id, {
        mode: 'checklist',
        checklist: textToChecklist(note.content),
      });
    }
  };

  const updateItem = (itemId, patch) => {
    const next = checklist.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
    onPatch(note.id, { checklist: next, content: checklistToText(next) });
  };

  const addChecklistItem = (afterIndex = checklist.length - 1) => {
    const newItem = { id: uid(), text: '', done: false };
    const next = [...checklist];
    next.splice(afterIndex + 1, 0, newItem);
    onPatch(note.id, { checklist: next });
  };

  const removeChecklistItem = (itemId) => {
    const next = checklist.filter((it) => it.id !== itemId);
    const safeNext = next.length ? next : [{ id: uid(), text: '', done: false }];
    onPatch(note.id, { checklist: safeNext, content: checklistToText(safeNext) });
  };

  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div
      className="group relative mb-4 break-inside-avoid rounded-3xl border border-black/10 p-4 text-[#2A2120] shadow-sm transition-all duration-200 hover:z-10 hover:shadow-md"
      style={{ backgroundColor: colorOf(note.color), transform: `rotate(${tiltOf(note.id)}deg)` }}
    >
      {/* Băng dính washi trang trí */}
      <span className="pointer-events-none absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[-3deg] rounded-sm bg-white/70 shadow-sm" />

      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-[#6E5D59]">
          {formatRelativeTime(note.updatedAt)}
          {isChecklist && checklist.length > 0 && ` · ${doneCount}/${checklist.length} mục`}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleMode}
            title={isChecklist ? 'Chuyển sang văn bản tự do' : 'Chuyển sang danh sách tích chọn (Checklist)'}
            className="rounded-lg p-1 text-[#6E5D59] opacity-0 transition hover:bg-black/5 hover:text-[#2A2120] group-hover:opacity-100 focus:opacity-100"
          >
            {isChecklist ? <AlignLeft size={14} /> : <CheckSquare size={14} />}
          </button>
          <button
            type="button"
            onClick={() => onTogglePin(note.id)}
            title={note.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
            className={cx(
              'rounded-lg p-1 transition focus:opacity-100',
              note.isPinned
                ? 'text-[#D66877]'
                : 'text-[#6E5D59] opacity-0 hover:bg-black/5 hover:text-[#2A2120] group-hover:opacity-100'
            )}
          >
            <Pin size={15} className={note.isPinned ? 'fill-[#F4ACB7]' : ''} />
          </button>
        </div>
      </div>

      {isChecklist ? (
        <div className="min-h-[112px] space-y-1.5 py-1">
          {checklist.map((item, idx) => (
            <div key={item.id} className="group/item flex items-start gap-2">
              <button
                type="button"
                onClick={() => updateItem(item.id, { done: !item.done })}
                className={cx(
                  'mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition',
                  item.done
                    ? 'border-[#5D8E65] bg-[#A3C9A8] text-[#1E3322]'
                    : 'border-black/25 bg-white/75 hover:border-[#D66877]'
                )}
              >
                {item.done && <Check size={12} strokeWidth={3} />}
              </button>
              <input
                type="text"
                spellCheck={false}
                value={item.text}
                placeholder="Nhập mục cần nhớ..."
                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChecklistItem(idx);
                  } else if (e.key === 'Backspace' && !item.text && checklist.length > 1) {
                    e.preventDefault();
                    removeChecklistItem(item.id);
                  }
                }}
                className={cx(
                  'w-full bg-transparent text-sm leading-snug text-[#2A2120] outline-none placeholder:text-[#6E5D59]/60',
                  item.done && 'text-[#6E5D59] line-through'
                )}
              />
              {checklist.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeChecklistItem(item.id)}
                  className="rounded p-0.5 text-[#6E5D59] opacity-0 transition hover:text-[#2A2120] group-hover/item:opacity-100"
                  title="Xóa dòng"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addChecklistItem()}
            className="mt-1 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-bold text-[#6E5D59] transition hover:bg-black/5 hover:text-[#2A2120]"
          >
            <Plus size={12} /> Thêm dòng
          </button>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          spellCheck={false}
          value={note.content}
          onChange={(e) => onPatch(note.id, { content: e.target.value })}
          placeholder="Viết ý tưởng chợt đến, từ vựng hay danh sách mua đồ..."
          className="min-h-[112px] w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-[#2A2120] outline-none placeholder:text-[#6E5D59]/65"
        />
      )}

      <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2">
        <span className="text-[10px] font-medium text-[#6E5D59]">
          {isChecklist ? 'Checklist' : `${(note.content || '').length} ký tự`}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <IconButton
            title="Chuyển thành Việc cần làm hôm nay"
            onClick={() => onConvertToTodo(note)}
            className="text-[#5C4B47] hover:bg-white/70 hover:text-[#2A2120]"
          >
            <CalendarPlus size={14} />
          </IconButton>

          <IconButton
            title="Lưu thành Bài ghi chú trong Học tập"
            onClick={() => onSaveToStudy(note)}
            className="text-[#5C4B47] hover:bg-white/70 hover:text-[#2A2120]"
          >
            <BookMarked size={14} />
          </IconButton>

          <div className="relative">
            <IconButton
              title="Đổi màu giấy"
              onClick={() => setPaletteOpen((o) => !o)}
              className="text-[#5C4B47] hover:bg-white/70 hover:text-[#2A2120]"
            >
              <Palette size={14} />
            </IconButton>
            {paletteOpen && (
              <div className="absolute bottom-9 right-0 z-20 flex gap-1.5 rounded-2xl border border-cozy-line bg-cozy-card p-2 shadow-md animate-pop-in">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      onPatch(note.id, { color: c.id });
                      setPaletteOpen(false);
                    }}
                    className={cx(
                      'h-6 w-6 rounded-full border-2 transition hover:scale-110',
                      note.color === c.id ? 'border-cozy-peach' : 'border-cozy-line'
                    )}
                    style={{ backgroundColor: c.bg }}
                  />
                ))}
              </div>
            )}
          </div>

          <IconButton
            title="Nhân bản"
            onClick={() => onDuplicate(note)}
            className="text-[#5C4B47] hover:bg-white/70 hover:text-[#2A2120]"
          >
            <Copy size={14} />
          </IconButton>

          <IconButton
            title={note.isPinned ? 'Bỏ ghim' : 'Ghim'}
            onClick={() => onTogglePin(note.id)}
            className="text-[#5C4B47] hover:bg-white/70 hover:text-[#2A2120]"
          >
            {note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </IconButton>

          <IconButton
            title="Xóa ghi chú"
            onClick={() => onDelete(note)}
            className="text-[#5C4B47] hover:bg-white/70 hover:text-[#C95467]"
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default function QuickNotes({ onNavigate }) {
  const [notes, setNotes] = useCozyStorage(STORAGE_KEYS.STICKY_NOTES);
  const [, setTodos] = useCozyStorage(STORAGE_KEYS.TODOS);
  const [subjects, setSubjects] = useCozyStorage(STORAGE_KEYS.SUBJECTS);
  const [, setMaterials] = useCozyStorage(STORAGE_KEYS.STUDY_MATERIALS);
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [newestId, setNewestId] = useState(null);

  const addNote = (color = 'butter', mode = 'text') => {
    const id = uid();
    const newNote = {
      id,
      content: '',
      mode,
      checklist: mode === 'checklist' ? [{ id: uid(), text: '', done: false }] : undefined,
      color,
      isPinned: false,
      updatedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setNewestId(id);
    setSearch('');
    setColorFilter('all');
  };

  const patchNote = (id, patch) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
    );
  };

  const togglePin = (id) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)));

  const deleteNote = (note) => {
    const idx = notes.findIndex((n) => n.id === note.id);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    toast({
      message: 'Đã xóa mẩu ghi chú.',
      onUndo: () => {
        setNotes((prev) => {
          if (prev.some((n) => n.id === note.id)) return prev;
          const copy = [...prev];
          copy.splice(Math.max(0, idx), 0, note);
          return copy;
        });
      },
    });
  };

  const duplicateNote = (note) => {
    const copy = {
      ...note,
      id: uid(),
      checklist: Array.isArray(note.checklist)
        ? note.checklist.map((it) => ({ ...it, id: uid() }))
        : undefined,
      isPinned: false,
      updatedAt: Date.now(),
    };
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    toast({ message: 'Đã nhân bản ghi chú ✨' });
  };

  const convertNoteToTodo = (note) => {
    const isChecklist = note.mode === 'checklist' && Array.isArray(note.checklist);
    const rawLines = isChecklist
      ? note.checklist.map((i) => ({ text: (i.text || '').trim(), done: Boolean(i.done) })).filter((i) => i.text)
      : String(note.content || '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((text) => ({ text, done: false }));

    if (!rawLines.length) {
      toast({ message: 'Ghi chú đang trống, hãy viết vài chữ trước nhé!', tone: 'info' });
      return;
    }

    const mainTitle = rawLines[0].text.slice(0, 120);
    const subtasks =
      rawLines.length > 1
        ? rawLines.slice(1).map((item) => ({ id: uid(), title: item.text, done: item.done }))
        : [];

    const createdId = uid();
    const newTodo = {
      id: createdId,
      title: mainTitle,
      date: todayISO(),
      priority: 'medium',
      category: 'Cá nhân',
      completed: false,
      subtasks,
    };

    setTodos((prev) => [newTodo, ...prev]);
    toast({
      message: `📅 Đã thêm "${mainTitle}" vào Việc cần làm hôm nay!`,
      undoLabel: 'Xem Lịch',
      onUndo: () => onNavigate?.('calendar'),
    });
  };

  const saveNoteToStudy = (note) => {
    const body =
      note.mode === 'checklist' && Array.isArray(note.checklist)
        ? note.checklist
            .filter((i) => (i.text || '').trim())
            .map((i) => `- [${i.done ? 'x' : ' '}] ${i.text.trim()}`)
            .join('\n')
        : String(note.content || '').trim();

    if (!body) {
      toast({ message: 'Ghi chú đang trống, hãy nhập nội dung trước khi lưu sang Học tập!', tone: 'info' });
      return;
    }

    let targetSubject = subjects[0];
    if (!targetSubject) {
      targetSubject = {
        id: uid(),
        name: 'Sổ tay chung',
        color: '#F4ACB7',
        coverSlotId: 'subject_default_cover',
        createdAt: Date.now(),
      };
      setSubjects((prev) => [...prev, targetSubject]);
    }

    const firstLine = body.split(/\r?\n/)[0].replace(/^[-*•[\]xX\s]+/, '').trim();
    const matId = uid();
    const newMat = {
      id: matId,
      subjectId: targetSubject.id,
      title: firstLine.slice(0, 60) || 'Ghi chú nhanh',
      content: body,
      type: 'note',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setMaterials((prev) => [...prev, newMat]);
    toast({
      message: `📚 Đã lưu vào môn "${targetSubject.name}"!`,
      undoLabel: 'Mở bài học',
      onUndo: () => {
        window.__cozyPendingSubject = { subjectId: targetSubject.id, materialId: matId };
        window.dispatchEvent(
          new CustomEvent('cozy-open-subject', {
            detail: { subjectId: targetSubject.id, materialId: matId },
          })
        );
        onNavigate?.('study');
      },
    });
  };

  // Thứ tự ổn định: ghim lên trước, còn lại giữ thứ tự tạo (mới nhất ở đầu) để không nhảy khi đang gõ
  const { pinned, others } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesQuery = (n) => {
      if (!q) return true;
      if ((n.content || '').toLowerCase().includes(q)) return true;
      if (Array.isArray(n.checklist) && n.checklist.some((i) => (i.text || '').toLowerCase().includes(q))) {
        return true;
      }
      return false;
    };
    const list = notes.filter(
      (n) => (colorFilter === 'all' || n.color === colorFilter) && matchesQuery(n)
    );
    return { pinned: list.filter((n) => n.isPinned), others: list.filter((n) => !n.isPinned) };
  }, [notes, search, colorFilter]);

  const renderGrid = (list) => (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
      {list.map((n) => (
        <NoteCard
          key={n.id}
          note={n}
          autoFocus={n.id === newestId}
          onPatch={patchNote}
          onTogglePin={togglePin}
          onDelete={deleteNote}
          onDuplicate={duplicateNote}
          onConvertToTodo={convertNoteToTodo}
          onSaveToStudy={saveNoteToStudy}
        />
      ))}
    </div>
  );

  const empty = pinned.length === 0 && others.length === 0;

  return (
    <div>
      <PageHeader
        icon={StickyNote}
        title="Ghi chú nhanh"
        subtitle="Những mẩu giấy nhỏ cho ý tưởng chợt đến — tự động lưu xuống ổ cứng ngay khi bạn gõ"
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => addNote('matcha', 'checklist')}>
              <CheckSquare size={16} /> Checklist mới
            </Button>
            <Button onClick={() => addNote('butter', 'text')}>
              <Plus size={16} /> Ghi chú mới
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cozy-muted" />
          <Input
            spellCheck={false}
            className="pl-9"
            placeholder="Tìm trong ghi chú & checklist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-2xl border border-cozy-line bg-cozy-card px-3 py-2">
          <button
            type="button"
            onClick={() => setColorFilter('all')}
            className={cx(
              'rounded-full px-2.5 py-0.5 text-xs font-bold transition',
              colorFilter === 'all' ? 'bg-cozy-peach text-[#2A2120]' : 'text-cozy-muted hover:text-cozy-text'
            )}
          >
            Tất cả
          </button>
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={`Lọc màu ${c.label}`}
              onClick={() => setColorFilter(c.id)}
              className={cx(
                'h-5 w-5 rounded-full border-2 transition hover:scale-110',
                colorFilter === c.id ? 'border-cozy-peach scale-110' : 'border-cozy-line'
              )}
              style={{ backgroundColor: c.bg }}
            />
          ))}
        </div>
        <span className="ml-auto text-xs font-semibold text-cozy-muted">{notes.length} ghi chú</span>
      </div>

      {empty ? (
        <EmptyState
          title={notes.length === 0 ? 'Chưa có mẩu ghi chú nào' : 'Không tìm thấy ghi chú phù hợp'}
          hint={
            notes.length === 0
              ? 'Bấm "Ghi chú mới" hoặc "Checklist mới" để lưu lại một ý tưởng nhỏ nhé!'
              : 'Thử từ khóa khác hoặc bỏ lọc màu.'
          }
          size="w-48"
          className="py-16"
        >
          {notes.length === 0 && (
            <div className="flex gap-2">
              {NOTE_COLORS.slice(0, 4).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => addNote(c.id)}
                  className="h-12 w-12 rounded-2xl border border-black/10 text-lg font-bold text-[#2A2120] shadow-sm transition hover:-translate-y-1"
                  style={{ backgroundColor: c.bg }}
                  title={`Ghi chú màu ${c.label}`}
                >
                  +
                </button>
              ))}
            </div>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-8 px-1 pt-2">
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-cozy-muted">
                <Pin size={14} className="fill-cozy-peach text-cozy-peach" /> Đã ghim
              </h2>
              {renderGrid(pinned)}
            </section>
          )}
          {others.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-cozy-muted">Khác</h2>
              )}
              {renderGrid(others)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
