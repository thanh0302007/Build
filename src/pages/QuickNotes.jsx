// (5) Ghi chú nhanh - Sticky Notes
import { useMemo, useRef, useState, useEffect } from 'react';
import { Plus, Pin, PinOff, Trash2, Palette, Search, Copy } from 'lucide-react';
import { Button, Input, PageHeader, IconButton, cx } from '../components/ui.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { uid, formatRelativeTime } from '../lib/utils.js';

// `color` trong cozy_sticky_notes lưu id màu dưới đây
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
  return ((Math.abs(h) % 5) - 2) * 0.6; // -1.2deg .. 1.2deg
};

function NoteCard({ note, autoFocus, onChange, onTogglePin, onDelete, onDuplicate }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  return (
    <div
      className="group relative mb-4 break-inside-avoid rounded-3xl border border-cozy-line p-4 shadow-sm transition-all duration-200 hover:z-10 hover:shadow-md"
      style={{ backgroundColor: colorOf(note.color), transform: `rotate(${tiltOf(note.id)}deg)` }}
    >
      {/* Băng dính washi trang trí */}
      <span className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[-3deg] rounded-sm bg-white/60 shadow-sm" />

      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-cozy-muted">{formatRelativeTime(note.updatedAt)}</span>
        <button
          type="button"
          onClick={() => onTogglePin(note.id)}
          title={note.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
          className={cx(
            'rounded-lg p-1 transition',
            note.isPinned ? 'text-cozy-peach' : 'text-cozy-muted opacity-0 hover:text-cozy-text group-hover:opacity-100'
          )}
        >
          <Pin size={15} className={note.isPinned ? 'fill-cozy-peach' : ''} />
        </button>
      </div>

      <textarea
        ref={ref}
        value={note.content}
        onChange={(e) => onChange(note.id, e.target.value)}
        placeholder="Viết gì đó thật dễ thương..."
        className="min-h-[110px] w-full resize-none bg-transparent text-sm leading-relaxed text-cozy-text outline-none placeholder:text-cozy-muted/70"
        style={{ fieldSizing: 'content' }}
      />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-cozy-muted">{note.content.length} ký tự</span>
        <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <div className="relative">
            <IconButton title="Đổi màu" onClick={() => setPaletteOpen((o) => !o)} className="hover:bg-white/60">
              <Palette size={15} />
            </IconButton>
            {paletteOpen && (
              <div className="absolute bottom-10 right-0 z-20 flex gap-1.5 rounded-2xl border border-cozy-line bg-white p-2 shadow-md animate-pop-in">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      onChange(note.id, undefined, c.id);
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
          <IconButton title="Nhân bản" onClick={() => onDuplicate(note)} className="hover:bg-white/60">
            <Copy size={15} />
          </IconButton>
          <IconButton title={note.isPinned ? 'Bỏ ghim' : 'Ghim'} onClick={() => onTogglePin(note.id)} className="hover:bg-white/60">
            {note.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
          </IconButton>
          <IconButton title="Xóa" onClick={() => onDelete(note)} className="hover:bg-white/60">
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default function QuickNotes() {
  const [notes, setNotes] = useCozyStorage(STORAGE_KEYS.STICKY_NOTES);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [newestId, setNewestId] = useState(null);

  const addNote = (color = 'butter') => {
    const id = uid();
    setNotes((prev) => [{ id, content: '', color, isPinned: false, updatedAt: Date.now() }, ...prev]);
    setNewestId(id);
    setSearch('');
    setColorFilter('all');
  };

  const changeNote = (id, content, color) =>
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, ...(content !== undefined && { content }), ...(color && { color }), updatedAt: Date.now() }
          : n
      )
    );

  const togglePin = (id) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)));

  const deleteNote = (note) => {
    if (note.content.trim() && !window.confirm('Xóa ghi chú này nhé?')) return;
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  };

  const duplicateNote = (note) => {
    const copy = { ...note, id: uid(), isPinned: false, updatedAt: Date.now() };
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  // Thứ tự ổn định: ghim lên trước, còn lại giữ thứ tự tạo (mới nhất ở đầu) để không nhảy khi đang gõ
  const { pinned, others } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = notes.filter(
      (n) => (colorFilter === 'all' || n.color === colorFilter) && (!q || n.content.toLowerCase().includes(q))
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
          onChange={changeNote}
          onTogglePin={togglePin}
          onDelete={deleteNote}
          onDuplicate={duplicateNote}
        />
      ))}
    </div>
  );

  const empty = pinned.length === 0 && others.length === 0;

  return (
    <div>
      <PageHeader
        emoji="🗒️"
        title="Ghi chú nhanh"
        subtitle="Những mẩu giấy nhỏ cho ý tưởng chợt đến — tự động lưu khi bạn gõ"
        right={
          <Button onClick={() => addNote()}>
            <Plus size={16} /> Ghi chú mới
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cozy-muted" />
          <Input className="pl-9" placeholder="Tìm trong ghi chú..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 rounded-2xl border border-cozy-line bg-white px-3 py-2">
          <button
            type="button"
            onClick={() => setColorFilter('all')}
            className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', colorFilter === 'all' ? 'bg-cozy-peach text-white' : 'text-cozy-muted')}
          >
            Tất cả
          </button>
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={`Lọc màu ${c.label}`}
              onClick={() => setColorFilter(c.id)}
              className={cx('h-5 w-5 rounded-full border-2 transition hover:scale-110', colorFilter === c.id ? 'border-cozy-peach' : 'border-cozy-line')}
              style={{ backgroundColor: c.bg }}
            />
          ))}
        </div>
        <span className="ml-auto text-xs font-semibold text-cozy-muted">{notes.length} ghi chú</span>
      </div>

      {empty ? (
        <EmptyState
          title={notes.length === 0 ? 'Chưa có mẩu ghi chú nào' : 'Không tìm thấy ghi chú phù hợp'}
          hint={notes.length === 0 ? 'Bấm "Ghi chú mới" để ghi lại một ý tưởng nhỏ nhé!' : 'Thử từ khóa khác hoặc bỏ lọc màu.'}
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
                  className="h-12 w-12 rounded-2xl border border-cozy-line text-lg shadow-sm transition hover:-translate-y-1"
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
              {pinned.length > 0 && <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-cozy-muted">Khác</h2>}
              {renderGrid(others)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

