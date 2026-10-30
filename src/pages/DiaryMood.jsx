// (4) Nhật ký & Cảm xúc - lưu vào `cozy_diary_entries` & dùng bộ 5 icon `mood_stickers`
import { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  ImagePlus,
  Link2,
  Trash2,
  Pencil,
  CalendarDays,
  Sparkles,
  X,
} from 'lucide-react';
import { Card, Button, Input, PageHeader, IconButton, Modal, cx } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { MOOD_SUB_SLOTS } from '../lib/imageSlots.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import {
  uid,
  todayISO,
  fromISODate,
  formatLongDate,
  formatShortDate,
  fileToCompressedDataURL,
} from '../lib/utils.js';

export const PAPER_COLORS = [
  { id: 'cream', label: 'Kem ấm', bg: '#FDFBF7' },
  { id: 'blush', label: 'Hồng phấn', bg: '#FFF9F9' },
  { id: 'butter', label: 'Vàng bơ', bg: '#FFFDF0' },
  { id: 'matcha', label: 'Matcha nhạt', bg: '#F2F8F3' },
  { id: 'lavender', label: 'Oải hương', bg: '#F7F3FC' },
  { id: 'white', label: 'Trắng sữa', bg: '#FFFFFF' },
];

const MOOD_MAP = Object.fromEntries(MOOD_SUB_SLOTS.map((m) => [m.mood, m]));

const paperBg = (color) =>
  PAPER_COLORS.find((p) => p.id === color || p.bg === color)?.bg || color || '#FFF9F9';

export default function DiaryMood() {
  const [entries, setEntries] = useCozyStorage(STORAGE_KEYS.DIARY_ENTRIES);
  const [moodFilter, setMoodFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Trạng thái form viết / sửa trang nhật ký
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(todayISO);
  const [mood, setMood] = useState('happy');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [paperColor, setPaperColor] = useState(PAPER_COLORS[1].bg);
  const [photos, setPhotos] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const fileInputRef = useRef(null);

  // Thống kê số lượng từng cảm xúc
  const moodCounts = useMemo(() => {
    const counts = { happy: 0, peaceful: 0, excited: 0, tired: 0, sad: 0 };
    entries.forEach((e) => {
      if (counts[e.mood] !== undefined) counts[e.mood] += 1;
    });
    return counts;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...entries]
      .filter((e) => (moodFilter === 'all' || e.mood === moodFilter))
      .filter(
        (e) =>
          !q ||
          (e.title || '').toLowerCase().includes(q) ||
          (e.content || '').toLowerCase().includes(q)
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.id).localeCompare(String(a.id)));
  }, [entries, moodFilter, search]);

  const resetForm = () => {
    setEditingId(null);
    setDate(todayISO());
    setMood('happy');
    setTitle('');
    setContent('');
    setPaperColor(PAPER_COLORS[1].bg);
    setPhotos([]);
    setPhotoUrl('');
    setShowUrlBox(false);
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setDate(entry.date || todayISO());
    setMood(entry.mood || 'happy');
    setTitle(entry.title || '');
    setContent(entry.content || '');
    setPaperColor(paperBg(entry.paperColor));
    setPhotos(Array.isArray(entry.photos) ? entry.photos : []);
    setSelectedId(entry.id);
  };

  const saveEntry = () => {
    const cleanTitle = title.trim() || `Nhật ký ngày ${formatShortDate(date)}`;
    if (!content.trim() && !title.trim() && photos.length === 0) return;

    const record = {
      id: editingId || uid(),
      date,
      mood,
      title: cleanTitle,
      content: content.trim(),
      paperColor,
      photos,
    };

    if (editingId) {
      setEntries((prev) => prev.map((e) => (e.id === editingId ? record : e)));
    } else {
      setEntries((prev) => [record, ...prev]);
    }
    setSelectedId(record.id);
    resetForm();
  };

  const deleteEntry = (id) => {
    if (!window.confirm('Xóa trang nhật ký này nhé?')) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) resetForm();
    if (selectedId === id) setSelectedId(null);
  };

  const handlePhotoFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const uploaded = [];
    for (const file of files.slice(0, 4)) {
      try {
        const dataUrl = await fileToCompressedDataURL(file, 900, 0.82);
        uploaded.push(dataUrl);
      } catch {
        /* bỏ qua ảnh lỗi */
      }
    }
    if (uploaded.length) setPhotos((prev) => [...prev, ...uploaded]);
  };

  const addPhotoByUrl = () => {
    const u = photoUrl.trim();
    if (!/^https?:\/\//i.test(u)) return;
    setPhotos((prev) => [...prev, u]);
    setPhotoUrl('');
    setShowUrlBox(false);
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <PageHeader
        emoji="📔"
        title="Nhật ký & Cảm xúc"
        subtitle="Ghi lại những khoảnh khắc dịu dàng mỗi ngày cùng bộ 5 sticker cảm xúc"
        right={
          editingId && (
            <Button variant="soft" size="sm" onClick={resetForm}>
              <Plus size={15} /> Viết trang mới
            </Button>
          )
        }
      />

      {/* Thanh tổng quan 5 Sticker Cảm xúc (`mood_stickers`) - có hỗ trợ 📷 Đổi ảnh cho từng icon */}
      <Card className="mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-cozy-muted">
            🌸 BỘ 5 STICKER CẢM XÚC · Bấm để lọc nhật ký, hoặc rê chuột vào icon để <b>📷 Đổi ảnh</b> riêng
          </p>
          {moodFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setMoodFilter('all')}
              className="text-xs font-bold text-cozy-peach hover:underline"
            >
              Xem tất cả ({entries.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {MOOD_SUB_SLOTS.map((m) => {
            const active = moodFilter === m.mood;
            return (
              <div
                key={m.slotId}
                onClick={() => setMoodFilter(active ? 'all' : m.mood)}
                className={cx(
                  'flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 transition',
                  active
                    ? 'border-cozy-peach bg-cozy-blush shadow-sm'
                    : 'border-cozy-line bg-white hover:bg-cozy-blush/60'
                )}
              >
                <ImageSlot
                  slotId={m.slotId}
                  defaultSvg={<m.Svg />}
                  compact
                  fit="contain"
                  buttonPosition="center"
                  className="h-12 w-12 shrink-0 rounded-2xl bg-cozy-bg p-1"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-cozy-text">{m.label}</p>
                  <p className="text-xs text-cozy-muted">{moodCounts[m.mood]} ngày</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* CỘT TRÁI: TRANG VIẾT NHẬT KÝ */}
        <Card
          className="p-6 transition-colors xl:col-span-3"
          style={{ backgroundColor: paperColor }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-cozy-line pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-cozy-peach" />
              <h2 className="text-base font-bold text-cozy-text">
                {editingId ? '✏️ Chỉnh sửa trang nhật ký' : '🖋️ Viết trang nhật ký hôm nay'}
              </h2>
            </div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto bg-white/90 py-1.5 text-xs font-semibold"
            />
          </div>

          {/* Chọn cảm xúc cho trang đang viết */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-bold text-cozy-muted">
              Hôm nay tâm trạng của bạn thế nào?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_SUB_SLOTS.map((m) => {
                const chosen = mood === m.mood;
                return (
                  <button
                    key={m.slotId}
                    type="button"
                    onClick={() => setMood(m.mood)}
                    className={cx(
                      'flex flex-col items-center gap-1 rounded-2xl border p-2 transition',
                      chosen
                        ? 'border-cozy-peach bg-white shadow-sm ring-2 ring-cozy-peach/30'
                        : 'border-cozy-line bg-white/60 opacity-75 hover:opacity-100'
                    )}
                  >
                    <div className="h-10 w-10">
                      <ImageSlot
                        slotId={m.slotId}
                        defaultSvg={<m.Svg />}
                        editable={false}
                        fit="contain"
                        className="h-full w-full"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-cozy-text">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tiêu đề & Nội dung */}
          <div className="space-y-3">
            <Input
              placeholder="Tiêu đề trang nhật ký (VD: Một chiều mưa dịu dàng...)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/90 font-bold"
            />

            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Kể cho CozySpace nghe những điều nhỏ bé đã diễn ra trong ngày hôm nay nhé..."
              className="cozy-scroll w-full resize-y rounded-2xl border border-cozy-line bg-white/85 p-4 text-sm leading-relaxed text-cozy-text outline-none focus:border-cozy-peach"
            />
          </div>

          {/* Ảnh kỷ niệm đính kèm */}
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((src, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-cozy-line bg-white p-1 shadow-sm"
                >
                  <img
                    src={src}
                    alt={`Kỷ niệm ${idx + 1}`}
                    onClick={() => setLightboxPhoto(src)}
                    className="h-full w-full cursor-pointer rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-cozy-text opacity-0 shadow transition group-hover:opacity-100"
                    title="Gỡ ảnh"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showUrlBox && (
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Dán URL hình ảnh kỷ niệm (https://...)"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPhotoByUrl()}
                className="bg-white"
              />
              <Button size="sm" onClick={addPhotoByUrl}>
                Thêm
              </Button>
            </div>
          )}

          {/* Thanh công cụ dưới: Màu giấy + Đính kèm ảnh + Lưu */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cozy-line pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-cozy-muted">Màu giấy:</span>
              {PAPER_COLORS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => setPaperColor(p.bg)}
                  className={cx(
                    'h-6 w-6 rounded-full border-2 transition hover:scale-110',
                    paperColor === p.bg ? 'border-cozy-peach' : 'border-cozy-line'
                  )}
                  style={{ backgroundColor: p.bg }}
                />
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-2 inline-flex items-center gap-1 rounded-xl border border-cozy-line bg-white px-2.5 py-1 text-xs font-semibold text-cozy-text hover:bg-cozy-blush"
              >
                <ImagePlus size={14} className="text-cozy-peach" /> Thêm ảnh
              </button>
              <button
                type="button"
                onClick={() => setShowUrlBox((s) => !s)}
                className="inline-flex items-center gap-1 rounded-xl border border-cozy-line bg-white px-2.5 py-1 text-xs font-semibold text-cozy-text hover:bg-cozy-blush"
              >
                <Link2 size={14} /> URL ảnh
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoFiles}
              />
            </div>

            <div className="flex gap-2">
              {editingId && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Hủy sửa
                </Button>
              )}
              <Button
                onClick={saveEntry}
                disabled={!content.trim() && !title.trim() && photos.length === 0}
              >
                {editingId ? 'Lưu cập nhật' : 'Lưu vào Nhật ký'}
              </Button>
            </div>
          </div>
        </Card>

        {/* CỘT PHẢI: DÒNG THỜI GIAN NHẬT KÝ */}
        <Card className="flex flex-col p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-cozy-text">🕰️ Dòng kỷ niệm ({filteredEntries.length})</h2>
          </div>

          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cozy-muted" />
            <Input
              className="pl-9"
              placeholder="Tìm trong nhật ký..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredEntries.length === 0 ? (
            <EmptyState
              title={entries.length === 0 ? 'Sổ nhật ký còn thơm mùi giấy mới' : 'Không tìm thấy trang nhật ký nào'}
              hint={
                entries.length === 0
                  ? 'Hãy chọn một cảm xúc và viết vài dòng đầu tiên ở khung bên trái nhé!'
                  : 'Thử đổi bộ lọc cảm xúc hoặc từ khóa tìm kiếm.'
              }
              size="w-36"
            />
          ) : (
            <div className="cozy-scroll -mr-1 max-h-[540px] space-y-3 overflow-y-auto pr-1">
              {filteredEntries.map((entry) => {
                const moodMeta = MOOD_MAP[entry.mood] || MOOD_SUB_SLOTS[0];
                const isSelected = selectedId === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedId(isSelected ? null : entry.id)}
                    style={{ backgroundColor: paperBg(entry.paperColor) }}
                    className={cx(
                      'group cursor-pointer rounded-3xl border p-4 shadow-sm transition hover:shadow-md',
                      isSelected ? 'border-cozy-peach ring-2 ring-cozy-peach/20' : 'border-cozy-line'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 shrink-0 rounded-2xl border border-cozy-line bg-white p-1">
                        <ImageSlot
                          slotId={moodMeta.slotId}
                          defaultSvg={<moodMeta.Svg />}
                          editable={false}
                          fit="contain"
                          className="h-full w-full"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cozy-muted">
                            <CalendarDays size={12} /> {formatLongDate(fromISODate(entry.date))}
                          </span>
                          <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                            <IconButton
                              title="Chỉnh sửa"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(entry);
                              }}
                            >
                              <Pencil size={14} />
                            </IconButton>
                            <IconButton
                              title="Xóa"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEntry(entry.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                        </div>

                        <h3 className="mt-0.5 font-bold text-cozy-text">{entry.title}</h3>
                        <p
                          className={cx(
                            'mt-1 whitespace-pre-wrap text-xs leading-relaxed text-cozy-text/90',
                            !isSelected && 'line-clamp-3'
                          )}
                        >
                          {entry.content}
                        </p>

                        {Array.isArray(entry.photos) && entry.photos.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {entry.photos.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt="Ảnh đính kèm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxPhoto(src);
                                }}
                                className="h-14 w-14 rounded-xl border border-cozy-line object-cover shadow-sm transition hover:scale-105"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Xem ảnh phóng to */}
      <Modal
        open={Boolean(lightboxPhoto)}
        onClose={() => setLightboxPhoto(null)}
        title="🖼️ Ảnh kỷ niệm"
        width="max-w-2xl"
      >
        {lightboxPhoto && (
          <img
            src={lightboxPhoto}
            alt="Ảnh kỷ niệm"
            className="mx-auto max-h-[70vh] rounded-2xl object-contain"
          />
        )}
      </Modal>
    </div>
  );
}

