// Tab 2 của StudyHub: Thẻ lật Flashcard 3D (có Lọc chưa thuộc, Sửa thẻ, Phím tắt Space / ← / → & Hoàn tác xóa)
import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Check,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Trash2,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { Button, Input, IconButton, cx } from '../../components/ui.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function FlashcardDeck({ flashcards = [], onChange }) {
  const { toast } = useToast();
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unknown' | 'known'
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Thêm hoặc sửa thẻ
  const [formMode, setFormMode] = useState(null); // null | 'add' | 'edit'
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const indexedCards = useMemo(
    () =>
      flashcards
        .map((card, realIdx) => ({ ...card, realIdx }))
        .filter((c) => {
          if (filterMode === 'unknown') return !c.known;
          if (filterMode === 'known') return Boolean(c.known);
          return true;
        }),
    [flashcards, filterMode]
  );

  const total = indexedCards.length;
  const safeIndex = total ? Math.min(index, total - 1) : 0;
  const current = indexedCards[safeIndex];
  const knownCount = flashcards.filter((c) => c.known).length;
  const unknownCount = flashcards.length - knownCount;

  useEffect(() => {
    setFlipped(false);
  }, [safeIndex, filterMode, flashcards.length]);

  const toggleKnown = () => {
    if (!current) return;
    const next = flashcards.map((c, i) =>
      i === current.realIdx ? { ...c, known: !c.known } : c
    );
    onChange(next);
  };

  // Phím tắt bàn phím khi đang học Flashcard: Space (lật), ←/→ (chuyển thẻ), Enter (đánh dấu thuộc)
  useEffect(() => {
    if (!current || formMode) return undefined;
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((i) => Math.max(0, Math.min(i, total - 1) - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex((i) => Math.min(total - 1, i + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, formMode, total]);

  const shuffleDeck = () => {
    if (flashcards.length < 2) return;
    const copy = [...flashcards];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    onChange(copy);
    setIndex(0);
    setFlipped(false);
    toast({ message: '🔀 Đã trộn ngẫu nhiên bộ thẻ!' });
  };

  const resetAllProgress = () => {
    onChange(flashcards.map((c) => ({ ...c, known: false })));
    setFilterMode('all');
    setIndex(0);
    toast({ message: '🔄 Đã đặt lại toàn bộ thẻ về trạng thái Chưa thuộc.' });
  };

  const removeCurrent = () => {
    if (!current) return;
    const removedIdx = current.realIdx;
    const removedCard = { front: current.front, back: current.back, known: current.known };
    const nextList = flashcards.filter((_, i) => i !== removedIdx);
    onChange(nextList);
    setIndex((i) => Math.max(0, i - 1));

    toast({
      message: 'Đã xóa thẻ Flashcard.',
      onUndo: () => {
        const restored = [...nextList];
        restored.splice(Math.min(removedIdx, restored.length), 0, removedCard);
        onChange(restored);
      },
    });
  };

  const openAddForm = () => {
    setFormMode('add');
    setFront('');
    setBack('');
  };

  const openEditForm = () => {
    if (!current) return;
    setFormMode('edit');
    setFront(current.front);
    setBack(current.back);
  };

  const saveFormCard = () => {
    if (!front.trim() || !back.trim()) return;
    if (formMode === 'edit' && current) {
      const next = flashcards.map((c, i) =>
        i === current.realIdx ? { ...c, front: front.trim(), back: back.trim() } : c
      );
      onChange(next);
      toast({ message: '✏️ Đã cập nhật thẻ Flashcard!' });
    } else {
      const next = [...flashcards, { front: front.trim(), back: back.trim(), known: false }];
      onChange(next);
      setFilterMode('all');
      setIndex(next.length - 1);
      toast({ message: '🎴 Đã thêm thẻ Flashcard mới!' });
    }
    setFront('');
    setBack('');
    setFormMode(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Bộ lọc trạng thái thuộc bài */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {[
            { id: 'all', label: `Tất cả (${flashcards.length})` },
            { id: 'unknown', label: `Chưa thuộc (${unknownCount})` },
            { id: 'known', label: `Đã thuộc (${knownCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilterMode(tab.id);
                setIndex(0);
              }}
              className={cx(
                'rounded-full px-3 py-1 transition',
                filterMode === tab.id
                  ? 'bg-cozy-peach text-[#2A2120] shadow-sm'
                  : 'bg-cozy-blush text-cozy-muted hover:text-cozy-text'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {knownCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetAllProgress} title="Học lại từ đầu">
              <RotateCcw size={13} /> Học lại
            </Button>
          )}
          {flashcards.length > 1 && (
            <Button variant="soft" size="sm" onClick={shuffleDeck}>
              <Shuffle size={14} /> Trộn thẻ
            </Button>
          )}
          <Button variant="soft" size="sm" onClick={openAddForm}>
            <Plus size={14} /> Thêm thẻ
          </Button>
        </div>
      </div>

      {formMode && (
        <div className="space-y-2.5 rounded-2xl border border-cozy-line bg-cozy-blush p-3.5 animate-pop-in">
          <p className="text-xs font-bold text-cozy-text">
            {formMode === 'edit' ? '✏️ Chỉnh sửa nội dung thẻ hiện tại' : '➕ Tạo thẻ Flashcard mới'}
          </p>
          <Input
            autoFocus
            placeholder="Mặt trước (câu hỏi / thuật ngữ)..."
            value={front}
            onChange={(e) => setFront(e.target.value)}
          />
          <textarea
            rows={2}
            placeholder="Mặt sau (đáp án / giải nghĩa)..."
            value={back}
            onChange={(e) => setBack(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveFormCard();
            }}
            className="cozy-scroll w-full resize-none rounded-2xl border border-cozy-line bg-cozy-card px-3.5 py-2 text-sm text-cozy-text outline-none focus:border-cozy-peach"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFormMode(null)}>
              Hủy
            </Button>
            <Button size="sm" onClick={saveFormCard} disabled={!front.trim() || !back.trim()}>
              {formMode === 'edit' ? 'Lưu thay đổi' : 'Lưu thẻ'}
            </Button>
          </div>
        </div>
      )}

      {flashcards.length === 0 ? (
        <EmptyState
          title="Chưa có thẻ Flashcard nào"
          hint="Bấm [🎴 Flashcard] ở khung Gemini bên phải rồi nhấn [🪄 Nhập vào Ôn tập], hoặc tự thêm thẻ mới."
          size="w-36"
        />
      ) : total === 0 ? (
        <EmptyState
          title={filterMode === 'unknown' ? 'Tuyệt vời! Bạn đã thuộc hết bộ thẻ 🎉' : 'Chưa có thẻ nào ở mục này'}
          hint="Bấm sang tab Tất cả hoặc nhấn Học lại để ôn thêm một vòng nhé."
          size="w-32"
        />
      ) : (
        <>
          {/* Thẻ lật 3D */}
          <div
            onClick={() => setFlipped((f) => !f)}
            className="group cursor-pointer select-none [perspective:1200px]"
          >
            <div
              className={cx(
                'relative h-64 w-full rounded-3xl transition-transform duration-500 [transform-style:preserve-3d]',
                flipped && '[transform:rotateY(180deg)]'
              )}
            >
              {/* Mặt trước */}
              <div className="absolute inset-0 flex flex-col justify-between rounded-3xl border-2 border-cozy-line bg-gradient-to-br from-cozy-card to-cozy-blush p-6 shadow-sm [backface-visibility:hidden]">
                <div className="flex items-center justify-between text-xs font-semibold text-cozy-muted">
                  <span>
                    🎴 MẶT TRƯỚC · Thẻ {safeIndex + 1}/{total}
                  </span>
                  {current.known && (
                    <span className="rounded-full bg-cozy-matcha/35 px-2.5 py-0.5 font-bold text-cozy-text">
                      ✓ Đã thuộc
                    </span>
                  )}
                </div>
                <p className="cozy-scroll my-auto max-h-36 overflow-y-auto text-center text-lg font-bold leading-relaxed text-cozy-text">
                  {current.front}
                </p>
                <p className="flex items-center justify-center gap-1.5 text-xs text-cozy-muted">
                  <RotateCw size={13} /> Bấm thẻ hoặc nhấn phím <kbd className="rounded bg-cozy-card px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-cozy-line">Space</kbd> để lật
                </p>
              </div>

              {/* Mặt sau */}
              <div className="absolute inset-0 flex flex-col justify-between rounded-3xl border-2 border-cozy-peach/60 bg-gradient-to-br from-cozy-butter/50 to-cozy-card p-6 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="flex items-center justify-between text-xs font-semibold text-cozy-muted">
                  <span>✨ MẶT SAU · Đáp án</span>
                  <span>
                    Thẻ {safeIndex + 1}/{total}
                  </span>
                </div>
                <p className="cozy-scroll my-auto max-h-36 overflow-y-auto whitespace-pre-wrap text-center text-base font-semibold leading-relaxed text-cozy-text">
                  {current.back}
                </p>
                <p className="flex items-center justify-center gap-1.5 text-xs text-cozy-muted">
                  <RotateCw size={13} /> Phím <kbd className="rounded bg-cozy-card px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-cozy-line">←</kbd> <kbd className="rounded bg-cozy-card px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-cozy-line">→</kbd> để chuyển thẻ nhanh
                </p>
              </div>
            </div>
          </div>

          {/* Điều khiển */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="soft"
                size="sm"
                disabled={safeIndex === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft size={16} /> Trước
              </Button>
              <Button
                variant="soft"
                size="sm"
                disabled={safeIndex >= total - 1}
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              >
                Tiếp <ChevronRight size={16} />
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant={current.known ? 'secondary' : 'butter'}
                size="sm"
                onClick={toggleKnown}
              >
                <Check size={15} /> {current.known ? 'Đã thuộc lòng' : 'Đánh dấu đã thuộc'}
              </Button>
              <IconButton title="Chỉnh sửa thẻ này" onClick={openEditForm}>
                <Pencil size={15} />
              </IconButton>
              <IconButton title="Xóa thẻ này" onClick={removeCurrent}>
                <Trash2 size={15} />
              </IconButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

