// (4) Nhật ký & Cảm xúc - lưu vào ổ cứng (`cozy_diary_entries` + `media/`), có Tự lưu nháp, Lịch cảm xúc tháng & Khóa PIN
import { useEffect, useMemo, useRef, useState } from 'react';
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
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  NotebookPen,
  Clock,
} from 'lucide-react';
import { Card, Button, Input, PageHeader, IconButton, Modal, cx } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { MOOD_SUB_SLOTS } from '../lib/imageSlots.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import {
  uid,
  todayISO,
  toISODate,
  fromISODate,
  WEEKDAYS_SHORT,
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

const DAILY_PROMPTS = [
  'Khoảnh khắc nhỏ bé nào trong ngày hôm nay khiến bạn thấy ấm lòng nhất?',
  'Hãy kể 3 điều giản dị mà bạn biết ơn trong ngày hôm nay.',
  'Hôm nay bạn đã cố gắng vì điều gì? Hãy tự dành cho mình một lời khen nhé!',
  'Một bài hát, cuốn sách hoặc câu nói nào đang vương vấn trong tâm trí bạn?',
  'Nếu gửi một lời nhắn dịu dàng cho chính mình vào sáng mai, bạn sẽ viết gì?',
  'Có điều gì đang làm bạn bận tâm không? Hãy viết ra đây để lòng nhẹ hơn nhé.',
];

const MOOD_MAP = Object.fromEntries(MOOD_SUB_SLOTS.map((m) => [m.mood, m]));

const paperBg = (color) =>
  PAPER_COLORS.find((p) => p.id === color || p.bg === color)?.bg || color || '#FFF9F9';

export default function DiaryMood() {
  const [entries, setEntries] = useCozyStorage(STORAGE_KEYS.DIARY_ENTRIES);
  const [savedDraft, setSavedDraft] = useCozyStorage(STORAGE_KEYS.DIARY_DRAFT);
  const [settings, setSettings] = useCozyStorage(STORAGE_KEYS.SETTINGS);
  const { toast } = useToast();

  const [moodFilter, setMoodFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showMoodCalendar, setShowMoodCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(() => todayISO().slice(0, 7)); // YYYY-MM
  const [promptIdx, setPromptIdx] = useState(0);

  // Khóa PIN riêng tư tùy chọn
  const hasPin = Boolean(settings?.diaryPin);
  const [unlocked, setUnlocked] = useState(() => !settings?.diaryPin);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [newPinDraft, setNewPinDraft] = useState('');

  // Trạng thái form viết / sửa trang nhật ký (nạp từ bản nháp nếu có)
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(() => savedDraft?.date || todayISO());
  const [mood, setMood] = useState(() => savedDraft?.mood || 'happy');
  const [title, setTitle] = useState(() => savedDraft?.title || '');
  const [content, setContent] = useState(() => savedDraft?.content || '');
  const [paperColor, setPaperColor] = useState(() => savedDraft?.paperColor || PAPER_COLORS[1].bg);
  const [photos, setPhotos] = useState(() => (Array.isArray(savedDraft?.photos) ? savedDraft.photos : []));
  const [photoUrl, setPhotoUrl] = useState('');
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const fileInputRef = useRef(null);

  // Tự động lưu bản nháp vào ổ cứng khi đang viết trang mới
  useEffect(() => {
    if (editingId) return;
    const hasDraftContent = Boolean(title.trim() || content.trim() || photos.length > 0);
    if (!hasDraftContent) {
      if (savedDraft) setSavedDraft(null);
      return;
    }
    setSavedDraft({
      date,
      mood,
      title,
      content,
      paperColor,
      photos,
      updatedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, date, mood, title, content, paperColor, photos]);

  // Thống kê số lượng từng cảm xúc
  const moodCounts = useMemo(() => {
    const counts = { happy: 0, peaceful: 0, excited: 0, tired: 0, sad: 0 };
    entries.forEach((e) => {
      if (counts[e.mood] !== undefined) counts[e.mood] += 1;
    });
    return counts;
  }, [entries]);

  // Map ngày -> entry gần nhất để hiển thị trên Lịch cảm xúc tháng
  const entryByDate = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (e.date && !map[e.date]) map[e.date] = e;
    });
    return map;
  }, [entries]);

  // Dữ liệu lưới Lịch cảm xúc tháng
  const moodCalendarCells = useMemo(() => {
    const [y, m] = calMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const offset = (first.getDay() + 6) % 7; // T2 = 0 .. CN = 6
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = toISODate(new Date(y, m - 1, d));
      cells.push({ day: d, iso, entry: entryByDate[iso] || null });
    }
    return cells;
  }, [calMonth, entryByDate]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...entries]
      .filter((e) => moodFilter === 'all' || e.mood === moodFilter)
      .filter(
        (e) =>
          !q ||
          (e.title || '').toLowerCase().includes(q) ||
          (e.content || '').toLowerCase().includes(q)
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.id).localeCompare(String(a.id)));
  }, [entries, moodFilter, search]);

  const resetForm = (clearDraft = true) => {
    setEditingId(null);
    setDate(todayISO());
    setMood('happy');
    setTitle('');
    setContent('');
    setPaperColor(PAPER_COLORS[1].bg);
    setPhotos([]);
    setPhotoUrl('');
    setShowUrlBox(false);
    if (clearDraft) setSavedDraft(null);
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
      toast({ message: '✨ Đã cập nhật trang nhật ký!' });
    } else {
      setEntries((prev) => [record, ...prev]);
      toast({ message: '📔 Đã lưu trang nhật ký vào ổ cứng!' });
    }
    setSelectedId(record.id);
    resetForm(true);
  };

  const deleteEntry = (entry) => {
    const idx = entries.findIndex((e) => e.id === entry.id);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    if (editingId === entry.id) resetForm(false);
    if (selectedId === entry.id) setSelectedId(null);

    toast({
      message: `Đã xóa "${entry.title}"`,
      onUndo: () => {
        setEntries((prev) => {
          if (prev.some((e) => e.id === entry.id)) return prev;
          const next = [...prev];
          next.splice(Math.max(0, idx), 0, entry);
          return next;
        });
      },
    });
  };

  // Lưu ảnh kỷ niệm trực tiếp vào thư mục CozySpaceData/media/ trên ổ cứng (không giới hạn số ảnh!)
  const handlePhotoFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploadingPhotos(true);
    const uploaded = [];
    for (const file of files) {
      try {
        const mediaUrl = await fileToCompressedDataURL(file, 1600, 0.86, 'diary');
        uploaded.push(mediaUrl);
      } catch {
        /* bỏ qua ảnh lỗi */
      }
    }
    setUploadingPhotos(false);
    if (uploaded.length) {
      setPhotos((prev) => [...prev, ...uploaded]);
      toast({ message: `🖼️ Đã đính kèm ${uploaded.length} ảnh kỷ niệm!` });
    }
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

  const insertDailyPrompt = () => {
    const promptText = DAILY_PROMPTS[promptIdx % DAILY_PROMPTS.length];
    setPromptIdx((i) => i + 1);
    setContent((prev) => (prev.trim() ? `${prev.trim()}\n\n${promptText}\n` : `${promptText}\n`));
  };

  const shiftCalMonth = (delta) => {
    const [y, m] = calMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleUnlock = () => {
    if (pinInput === settings?.diaryPin) {
      setUnlocked(true);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Mã PIN chưa đúng, bạn thử lại nhé!');
    }
  };

  const handleSavePinSetting = () => {
    const cleaned = newPinDraft.replace(/[^\d]/g, '').slice(0, 6);
    if (cleaned && cleaned.length < 4) {
      toast({ message: 'Mã PIN cần từ 4 đến 6 chữ số nhé!', tone: 'error' });
      return;
    }
    setSettings((prev) => ({ ...prev, diaryPin: cleaned }));
    setUnlocked(true);
    setPinModalOpen(false);
    setNewPinDraft('');
    toast({
      message: cleaned
        ? '🔒 Đã bật mã PIN bảo vệ riêng tư cho Nhật ký!'
        : '🔓 Đã gỡ khóa PIN Nhật ký.',
    });
  };

  // Màn hình khóa riêng tư nếu người dùng đặt mã PIN
  if (hasPin && !unlocked) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-cozy-blush text-cozy-peach ring-1 ring-cozy-line">
            <Lock size={26} />
          </div>
          <h2 className="text-lg font-bold text-cozy-text">Sổ nhật ký đang được khóa riêng tư</h2>
          <p className="mt-1 text-xs text-cozy-muted">
            Nhập mã PIN của bạn để mở lại những trang kỷ niệm nhé 🌸
          </p>
          <div className="mt-5 flex gap-2">
            <Input
              autoFocus
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Nhập mã PIN..."
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="text-center text-base tracking-[0.35em]"
            />
            <Button onClick={handleUnlock}>Mở sổ</Button>
          </div>
          {pinError && <p className="mt-2 text-xs font-semibold text-cozy-accent">{pinError}</p>}
        </Card>
      </div>
    );
  }

  const [calYearNum, calMonthNum] = calMonth.split('-').map(Number);
  const isDraftActive = !editingId && Boolean(title.trim() || content.trim() || photos.length > 0);

  return (
    <div>
      <PageHeader
        icon={NotebookPen}
        title="Nhật ký & Cảm xúc"
        subtitle="Ghi lại khoảnh khắc mỗi ngày — tự động lưu nháp và cất ảnh gốc an toàn trên ổ cứng"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={showMoodCalendar ? 'primary' : 'soft'}
              size="sm"
              onClick={() => setShowMoodCalendar((v) => !v)}
            >
              <CalendarDays size={15} /> {showMoodCalendar ? 'Ẩn Lịch cảm xúc' : 'Lịch cảm xúc tháng'}
            </Button>
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                setNewPinDraft(settings?.diaryPin || '');
                setPinModalOpen(true);
              }}
              title="Đặt hoặc gỡ mã PIN riêng tư cho Nhật ký"
            >
              {hasPin ? <Lock size={14} /> : <Unlock size={14} />} {hasPin ? 'Đổi/Gỡ PIN' : 'Khóa PIN'}
            </Button>
            {hasPin && (
              <Button variant="ghost" size="sm" onClick={() => setUnlocked(false)}>
                Khóa ngay
              </Button>
            )}
            {editingId && (
              <Button variant="soft" size="sm" onClick={() => resetForm(false)}>
                <Plus size={15} /> Viết trang mới
              </Button>
            )}
          </div>
        }
      />

      {/* Dải duy nhất 5 Nhân vật Cảm xúc: Thống kê số ngày + Chọn tâm trạng hôm nay + Lọc nhật ký */}
      <Card className="mb-6 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
            <Sparkles size={14} strokeWidth={1.75} className="text-cozy-accent" />
            <span>
              Chạm vào nhân vật để chọn tâm trạng viết hôm nay (<b className="text-cozy-text">{MOOD_MAP[mood]?.label}</b>) · Bấm số ngày để lọc nhật ký
            </span>
          </p>
          {moodFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setMoodFilter('all')}
              className="text-xs font-bold text-cozy-accent hover:underline"
            >
              Bỏ lọc · Xem tất cả ({entries.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {MOOD_SUB_SLOTS.map((m) => {
            const isSelectedMood = mood === m.mood;
            const isFiltered = moodFilter === m.mood;
            return (
              <div
                key={m.slotId}
                onClick={() => setMood(m.mood)}
                style={{
                  border: isSelectedMood
                    ? '1.5px solid var(--accent)'
                    : '1px solid var(--border-subtle)',
                  backgroundColor: isSelectedMood
                    ? 'color-mix(in srgb, var(--accent) 14%, var(--bg-card))'
                    : 'transparent',
                }}
                className="flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 transition hover:bg-black/[0.02]"
              >
                <ImageSlot
                  slotId={m.slotId}
                  defaultSvg={<m.Svg />}
                  compact
                  fit="contain"
                  buttonPosition="center"
                  className="h-11 w-11 shrink-0 rounded-xl p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: isSelectedMood ? 'var(--accent)' : 'transparent',
                      }}
                    />
                    <p className="whitespace-nowrap text-sm font-bold text-cozy-text">{m.label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoodFilter(isFiltered ? 'all' : m.mood);
                    }}
                    title="Bấm để lọc các trang nhật ký theo cảm xúc này"
                    className={cx(
                      'mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition',
                      isFiltered
                        ? 'bg-cozy-peach font-bold text-[#2A2120]'
                        : 'text-[var(--text-muted)] hover:bg-black/5 hover:text-cozy-text'
                    )}
                  >
                    <span>{moodCounts[m.mood]} ngày</span>
                    <span>· {isFiltered ? 'Đang lọc' : 'Lọc'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lịch cảm xúc tháng (Mood Calendar) */}
        {showMoodCalendar && (
          <div
            className="mt-4 pt-4 animate-fade-in"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-cozy-text">
                <CalendarDays size={14} strokeWidth={1.75} className="text-cozy-accent" />
                <span>Bức tranh cảm xúc tháng {calMonthNum}/{calYearNum}</span>
              </span>
              <div
                className="flex items-center gap-1 rounded-xl px-1.5 py-0.5"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <button
                  type="button"
                  onClick={() => shiftCalMonth(-1)}
                  className="rounded-lg p-1 text-[var(--text-muted)] hover:text-cozy-text"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="min-w-[82px] text-center text-xs font-bold text-cozy-text">
                  {calMonthNum}/{calYearNum}
                </span>
                <button
                  type="button"
                  onClick={() => shiftCalMonth(1)}
                  className="rounded-lg p-1 text-[var(--text-muted)] hover:text-cozy-text"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {WEEKDAYS_SHORT.map((w) => (
                <div key={w} className="py-1 text-[11px] font-bold text-[var(--text-muted)]">
                  {w}
                </div>
              ))}
              {moodCalendarCells.map((cell, idx) => {
                if (!cell) return <div key={`blank-${idx}`} className="h-14" />;
                const moodMeta = cell.entry ? MOOD_MAP[cell.entry.mood] || MOOD_SUB_SLOTS[0] : null;
                const isToday = cell.iso === todayISO();
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => {
                      if (cell.entry) {
                        setSelectedId(cell.entry.id);
                      } else {
                        setEditingId(null);
                        setDate(cell.iso);
                      }
                    }}
                    title={
                      cell.entry
                        ? `${cell.iso}: ${cell.entry.title}`
                        : `Chưa viết ngày ${cell.iso} — Bấm để chọn ngày này`
                    }
                    style={{ border: '1px solid var(--border-subtle)' }}
                    className={cx(
                      'flex h-14 flex-col items-center justify-between rounded-2xl p-1 transition hover:bg-black/[0.02]',
                      cell.entry ? 'bg-black/[0.02]' : 'bg-transparent',
                      isToday && 'ring-1 ring-cozy-peach'
                    )}
                  >
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">{cell.day}</span>
                    {moodMeta ? (
                      <div className="h-7 w-7">
                        <ImageSlot
                          slotId={moodMeta.slotId}
                          defaultSvg={<moodMeta.Svg />}
                          editable={false}
                          fit="contain"
                          className="h-full w-full"
                        />
                      </div>
                    ) : (
                      <span className="mb-1 text-[10px] text-[var(--text-muted)]/40">·</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* CỘT TRÁI: TRANG GIẤY SỔ TAY NHẬT KÝ LIỀN MẠCH */}
        <Card
          className="flex flex-col justify-between p-6 text-[#2A2120] transition-colors xl:col-span-3"
          style={{ backgroundColor: paperColor }}
        >
          {/* Phần đầu trang giấy sổ tay */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.08] pb-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="h-7 w-7 shrink-0">
                  {(() => {
                    const activeMoodMeta = MOOD_MAP[mood] || MOOD_SUB_SLOTS[0];
                    return (
                      <ImageSlot
                        slotId={activeMoodMeta.slotId}
                        defaultSvg={<activeMoodMeta.Svg />}
                        editable={false}
                        fit="contain"
                        className="h-full w-full"
                      />
                    );
                  })()}
                </div>
                <h2 className="text-base font-bold text-[#2A2120]">
                  {editingId ? 'Chỉnh sửa trang nhật ký' : 'Viết trang nhật ký hôm nay'}
                </h2>
                <span className="text-xs font-medium text-[#6E5D59]">
                  · Tâm trạng: <b className="text-[#2A2120]">{MOOD_MAP[mood]?.label}</b>
                </span>
                {isDraftActive && (
                  <span className="text-[11px] font-medium italic text-[#6E5D59]">
                    (Đã tự lưu nháp)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={insertDailyPrompt}
                  className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-transparent px-2.5 py-1 text-xs font-semibold text-[#2A2120] transition hover:bg-black/5"
                  title="Chèn một câu hỏi gợi mở nhẹ nhàng để dễ bắt đầu viết"
                >
                  <Lightbulb size={13} strokeWidth={1.75} className="text-[#D66877]" /> Gợi ý viết
                </button>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl border border-black/10 bg-transparent px-2.5 py-1 text-xs font-semibold text-[#2A2120] outline-none"
                />
              </div>
            </div>

            {/* Bề mặt trang giấy sổ tay liền mạch (Tiêu đề + Nội dung không tách rời hộp viền) */}
            <div
              className="px-1 pt-1"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, rgba(61, 53, 53, 0.065) 31px, rgba(61, 53, 53, 0.065) 32px)',
                backgroundPositionY: '2.6rem',
              }}
            >
              <input
                type="text"
                spellCheck={false}
                placeholder="Tiêu đề trang nhật ký (VD: Một chiều mưa dịu dàng...)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-0 border-b border-black/[0.08] bg-transparent pb-2.5 text-lg font-bold text-[#2A2120] outline-none placeholder:font-semibold placeholder:text-[#6E5D59]/55"
              />

              <textarea
                rows={11}
                spellCheck={false}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Kể cho CozySpace nghe những điều nhỏ bé đã diễn ra trong ngày hôm nay nhé..."
                className="cozy-scroll mt-1 w-full resize-y border-0 bg-transparent py-1 text-sm leading-[32px] text-[#2A2120] outline-none placeholder:text-[#6E5D59]/55"
              />
            </div>
          </div>

          {/* Ảnh kỷ niệm đính kèm */}
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((src, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-black/10 bg-white p-1 shadow-sm"
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
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-[#2A2120] opacity-0 shadow transition group-hover:opacity-100"
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
              <input
                type="text"
                spellCheck={false}
                placeholder="Dán URL hình ảnh kỷ niệm (https://...)"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPhotoByUrl()}
                className="w-full rounded-2xl border border-black/10 bg-white px-3.5 py-2 text-sm text-[#2A2120] outline-none focus:border-[#F4ACB7]"
              />
              <Button size="sm" onClick={addPhotoByUrl}>
                Thêm
              </Button>
            </div>
          )}

          {/* Thanh công cụ dưới: Màu giấy + Đính kèm ảnh + Lưu */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#6E5D59]">Màu giấy:</span>
              {PAPER_COLORS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => setPaperColor(p.bg)}
                  className={cx(
                    'h-6 w-6 rounded-full border-2 transition hover:scale-110',
                    paperColor === p.bg ? 'border-[#D66877]' : 'border-black/15'
                  )}
                  style={{ backgroundColor: p.bg }}
                />
              ))}

              <button
                type="button"
                disabled={uploadingPhotos}
                onClick={() => fileInputRef.current?.click()}
                className="ml-1 inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-[#2A2120] hover:bg-[#FFF9F9]"
              >
                <ImagePlus size={14} className="text-[#D66877]" />
                {uploadingPhotos ? 'Đang lưu ảnh...' : 'Thêm ảnh kỷ niệm'}
              </button>
              <button
                type="button"
                onClick={() => setShowUrlBox((s) => !s)}
                className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-[#2A2120] hover:bg-[#FFF9F9]"
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
              {(editingId || isDraftActive) && (
                <Button variant="ghost" size="sm" onClick={() => resetForm(true)}>
                  {editingId ? 'Hủy sửa' : 'Xóa nháp'}
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
            <h2 className="flex items-center gap-2 text-base font-bold text-cozy-text">
              <Clock size={16} strokeWidth={1.75} className="text-cozy-accent" />
              <span>Dòng kỷ niệm ({filteredEntries.length})</span>
            </h2>
          </div>

          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              spellCheck={false}
              className="pl-9"
              placeholder="Tìm trong nhật ký..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredEntries.length === 0 ? (
            <EmptyState
              title={
                entries.length === 0
                  ? 'Sổ nhật ký còn thơm mùi giấy mới'
                  : 'Không tìm thấy trang nhật ký nào'
              }
              hint={
                entries.length === 0
                  ? 'Hãy chọn một cảm xúc và viết vài dòng đầu tiên ở khung bên trái nhé!'
                  : 'Thử đổi bộ lọc cảm xúc hoặc từ khóa tìm kiếm.'
              }
              size="w-36"
            />
          ) : (
            <div className="cozy-scroll -mr-1 max-h-[560px] overflow-y-auto pr-1">
              {filteredEntries.map((entry) => {
                const moodMeta = MOOD_MAP[entry.mood] || MOOD_SUB_SLOTS[0];
                const isSelected = selectedId === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedId(isSelected ? null : entry.id)}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    className={cx(
                      'group cursor-pointer py-3.5 transition hover:bg-black/[0.015]',
                      isSelected && 'bg-black/[0.025] px-2 rounded-xl'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-xl p-0.5">
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
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                            <CalendarDays size={12} strokeWidth={1.75} /> {formatLongDate(fromISODate(entry.date))}
                          </span>
                          <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
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
                                deleteEntry(entry);
                              }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                        </div>

                        <h3 className="mt-0.5 break-words font-bold text-cozy-text">{entry.title}</h3>
                        <p
                          className={cx(
                            'mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-muted)]',
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
                                className="h-14 w-14 rounded-xl border border-black/10 object-cover shadow-sm transition hover:scale-105"
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

      {/* Modal đặt / gỡ mã PIN riêng tư */}
      <Modal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <Lock size={17} strokeWidth={1.75} className="text-cozy-accent" />
            <span>Khóa PIN riêng tư cho Nhật ký</span>
          </span>
        }
        width="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-cozy-muted">
            Đặt mã PIN (4–6 chữ số) để bảo vệ sổ nhật ký khi có người mượn máy tính. Để trống rồi bấm Lưu nếu bạn muốn gỡ khóa PIN.
          </p>
          <Input
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập 4–6 chữ số (hoặc để trống để gỡ khóa)..."
            value={newPinDraft}
            onChange={(e) => setNewPinDraft(e.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleSavePinSetting()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPinModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSavePinSetting}>Lưu cài đặt PIN</Button>
          </div>
        </div>
      </Modal>

      {/* Xem ảnh phóng to */}
      <Modal
        open={Boolean(lightboxPhoto)}
        onClose={() => setLightboxPhoto(null)}
        title="Ảnh kỷ niệm"
        width="max-w-3xl"
      >
        {lightboxPhoto && (
          <img
            src={lightboxPhoto}
            alt="Ảnh kỷ niệm"
            className="mx-auto max-h-[75vh] rounded-2xl object-contain"
          />
        )}
      </Modal>
    </div>
  );
}
