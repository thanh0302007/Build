// Tab 3 của StudyHub: Đấu trường Trắc nghiệm Quiz (Chế độ Thi khóa đáp án, Làm lại câu sai, Sửa câu hỏi & Lưu điểm kỷ lục)
import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  ShieldCheck,
} from 'lucide-react';
import { Button, Input, IconButton, cx } from '../../components/ui.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function QuizArena({ quizzes = [], bestScore = null, onChange, onBestScore }) {
  const { toast, celebrate } = useToast();
  const [answers, setAnswers] = useState({}); // { [realQIndex]: optionIndex }
  const [examMode, setExamMode] = useState(true); // true = khóa đáp án sau lần chọn đầu tiên
  const [wrongOnlyIds, setWrongOnlyIds] = useState(null); // Array<number> | null

  // Form thêm / sửa câu hỏi
  const [formState, setFormState] = useState(null); // null | { mode: 'add' | 'edit', qIdx?: number }
  const [draft, setDraft] = useState({
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  });

  const visibleItems = useMemo(() => {
    const all = quizzes.map((q, realIdx) => ({ ...q, realIdx }));
    if (Array.isArray(wrongOnlyIds) && wrongOnlyIds.length > 0) {
      const set = new Set(wrongOnlyIds);
      return all.filter((item) => set.has(item.realIdx));
    }
    return all;
  }, [quizzes, wrongOnlyIds]);

  const total = visibleItems.length;
  const answeredCount = visibleItems.filter((q) => answers[q.realIdx] !== undefined).length;
  const correctCount = visibleItems.filter(
    (q) => answers[q.realIdx] !== undefined && answers[q.realIdx] === q.correctIndex
  ).length;
  const wrongIndices = visibleItems
    .filter((q) => answers[q.realIdx] !== undefined && answers[q.realIdx] !== q.correctIndex)
    .map((q) => q.realIdx);

  const score10 = total ? Math.round((correctCount / total) * 100) / 10 : 0;

  // Khi làm hết bộ câu hỏi chính -> ghi nhận điểm cao nhất
  useEffect(() => {
    if (!wrongOnlyIds && quizzes.length > 0 && answeredCount === quizzes.length) {
      if (bestScore == null || score10 > bestScore) {
        onBestScore?.(score10);
      }
      if (score10 === 10 && quizzes.length >= 3) {
        celebrate('Điểm 10 tuyệt đối bài Quiz! Quá xuất sắc 🏆');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredCount, quizzes.length, wrongOnlyIds]);

  const selectOption = (realIdx, optIdx) => {
    if (examMode && answers[realIdx] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [realIdx]: optIdx }));
  };

  const resetQuiz = () => {
    setWrongOnlyIds(null);
    setAnswers({});
  };

  const retryWrongOnly = () => {
    if (!wrongIndices.length) return;
    const toRetry = [...wrongIndices];
    setWrongOnlyIds(toRetry);
    setAnswers((prev) => {
      const next = { ...prev };
      toRetry.forEach((idx) => delete next[idx]);
      return next;
    });
    toast({ message: `🔄 Đang luyện lại ${toRetry.length} câu chưa đúng!` });
  };

  const deleteQuestion = (realIdx) => {
    const removed = quizzes[realIdx];
    const nextList = quizzes.filter((_, i) => i !== realIdx);
    onChange(nextList);
    setAnswers({});
    setWrongOnlyIds(null);

    toast({
      message: 'Đã xóa câu hỏi trắc nghiệm.',
      onUndo: () => {
        const restored = [...nextList];
        restored.splice(Math.min(realIdx, restored.length), 0, removed);
        onChange(restored);
      },
    });
  };

  const openAddForm = () => {
    setFormState({ mode: 'add' });
    setDraft({ question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' });
  };

  const openEditForm = (q, realIdx) => {
    const padded = [...(q.options || [])];
    while (padded.length < 4) padded.push('');
    setFormState({ mode: 'edit', qIdx: realIdx });
    setDraft({
      question: q.question || '',
      options: padded.slice(0, 4),
      correctIndex: q.correctIndex || 0,
      explanation: q.explanation || '',
    });
  };

  const saveFormQuiz = () => {
    const question = draft.question.trim();
    const opts = draft.options.map((o) => o.trim()).filter(Boolean);
    if (!question || opts.length < 2) return;
    const item = {
      question,
      options: opts,
      correctIndex: Math.min(draft.correctIndex, opts.length - 1),
      explanation: draft.explanation.trim(),
    };

    if (formState?.mode === 'edit' && formState.qIdx !== undefined) {
      onChange(quizzes.map((q, i) => (i === formState.qIdx ? item : q)));
      toast({ message: '✏️ Đã cập nhật câu hỏi Quiz!' });
    } else {
      onChange([...quizzes, item]);
      toast({ message: '📝 Đã thêm câu hỏi mới!' });
    }
    setFormState(null);
  };

  return (
    <div className="space-y-4">
      {/* Thanh điểm số & chế độ làm bài */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cozy-line bg-cozy-blush px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-cozy-card px-3 py-1 text-cozy-text ring-1 ring-cozy-line">
            Đã làm {answeredCount}/{total}
          </span>
          <span className="rounded-full bg-cozy-matcha/30 px-3 py-1 text-cozy-text">
            Đúng {correctCount}/{total}
          </span>
          {total > 0 && (
            <span className="rounded-full bg-cozy-butter px-3 py-1 font-bold text-[#2A2120]">
              🎯 Điểm: {score10}/10
            </span>
          )}
          {bestScore != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cozy-lavender px-2.5 py-1 font-bold text-[#2A2120]">
              <Trophy size={12} /> Kỷ lục: {bestScore}/10
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExamMode((m) => !m)}
            title="Chế độ Thi sẽ khóa đáp án ngay sau lần bấm đầu tiên để tính điểm trung thực"
            className={cx(
              'inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition',
              examMode
                ? 'border-cozy-peach bg-cozy-card text-cozy-text'
                : 'border-cozy-line bg-cozy-card/60 text-cozy-muted'
            )}
          >
            <ShieldCheck size={13} className={examMode ? 'text-cozy-peach' : ''} />
            {examMode ? 'Chế độ Thi' : 'Luyện tự do'}
          </button>

          {wrongIndices.length > 0 && answeredCount === total && (
            <Button variant="butter" size="sm" onClick={retryWrongOnly}>
              <RotateCcw size={13} /> Làm lại {wrongIndices.length} câu sai
            </Button>
          )}

          {(answeredCount > 0 || wrongOnlyIds) && (
            <Button variant="soft" size="sm" onClick={resetQuiz}>
              {wrongOnlyIds ? 'Xem cả đề' : 'Làm lại'}
            </Button>
          )}

          <Button variant="soft" size="sm" onClick={openAddForm}>
            <Plus size={14} /> Thêm câu
          </Button>
        </div>
      </div>

      {formState && (
        <div className="space-y-2.5 rounded-2xl border border-cozy-line bg-cozy-card p-4 animate-pop-in">
          <p className="text-xs font-bold text-cozy-text">
            {formState.mode === 'edit' ? '✏️ Chỉnh sửa câu hỏi trắc nghiệm' : '➕ Thêm câu hỏi trắc nghiệm mới'}
          </p>
          <Input
            autoFocus
            placeholder="Nội dung câu hỏi trắc nghiệm..."
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {['A', 'B', 'C', 'D'].map((letter, idx) => (
              <div key={letter} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, correctIndex: idx })}
                  title="Chọn làm đáp án đúng"
                  className={cx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition',
                    draft.correctIndex === idx
                      ? 'bg-cozy-matcha text-[#1E3322]'
                      : 'bg-cozy-blush text-cozy-muted'
                  )}
                >
                  {letter}
                </button>
                <Input
                  placeholder={`Đáp án ${letter}...`}
                  value={draft.options[idx]}
                  onChange={(e) => {
                    const next = [...draft.options];
                    next[idx] = e.target.value;
                    setDraft({ ...draft, options: next });
                  }}
                />
              </div>
            ))}
          </div>
          <Input
            placeholder="Giải thích đáp án (tùy chọn)..."
            value={draft.explanation}
            onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-cozy-muted">
              Bấm vào chữ A/B/C/D màu xanh để đánh dấu đáp án đúng
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFormState(null)}>
                Hủy
              </Button>
              <Button size="sm" onClick={saveFormQuiz}>
                {formState.mode === 'edit' ? 'Lưu thay đổi' : 'Lưu câu hỏi'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {quizzes.length === 0 ? (
        <EmptyState
          title="Chưa có câu hỏi Quiz nào"
          hint="Bấm [📝 Quiz] ở khung Gemini bên phải rồi nhấn [🪄 Nhập vào Ôn tập] để tạo đề trắc nghiệm tự động!"
          size="w-36"
        />
      ) : (
        <div className="cozy-scroll max-h-[500px] space-y-4 overflow-y-auto pr-1">
          {visibleItems.map((q, displayIdx) => {
            const chosen = answers[q.realIdx];
            const hasAnswered = chosen !== undefined;
            const isCorrect = hasAnswered && chosen === q.correctIndex;
            return (
              <div
                key={q.realIdx}
                className="group rounded-3xl border border-cozy-line bg-cozy-card p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="font-bold text-cozy-text">
                    <span className="mr-2 rounded-xl bg-cozy-lavender px-2.5 py-0.5 text-xs text-[#2A2120]">
                      Câu {wrongOnlyIds ? q.realIdx + 1 : displayIdx + 1}
                    </span>
                    {q.question}
                  </p>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <IconButton title="Chỉnh sửa câu này" onClick={() => openEditForm(q, q.realIdx)}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton title="Xóa câu này" onClick={() => deleteQuestion(q.realIdx)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isThisCorrect = optIdx === q.correctIndex;
                    const isThisChosen = chosen === optIdx;
                    let toneClass = 'border-cozy-line bg-cozy-bg/60 hover:bg-cozy-blush';
                    if (hasAnswered) {
                      if (isThisCorrect) {
                        toneClass = 'border-cozy-matcha bg-cozy-matcha/25 font-semibold';
                      } else if (isThisChosen) {
                        toneClass = 'border-cozy-peach bg-cozy-peach/25';
                      } else {
                        toneClass = 'border-cozy-line bg-cozy-card opacity-65';
                      }
                    }
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={examMode && hasAnswered}
                        onClick={() => selectOption(q.realIdx, optIdx)}
                        className={cx(
                          'flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-sm text-cozy-text transition',
                          toneClass,
                          examMode && hasAnswered && 'cursor-default'
                        )}
                      >
                        <span
                          className={cx(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                            hasAnswered && isThisCorrect
                              ? 'bg-cozy-matcha text-[#1E3322]'
                              : hasAnswered && isThisChosen
                                ? 'bg-cozy-peach text-[#2A2120]'
                                : 'bg-cozy-card text-cozy-text ring-1 ring-cozy-line'
                          )}
                        >
                          {letter}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {hasAnswered && isThisCorrect && (
                          <CheckCircle2 size={17} className="shrink-0 text-[#4B8355]" />
                        )}
                        {hasAnswered && isThisChosen && !isThisCorrect && (
                          <XCircle size={17} className="shrink-0 text-cozy-accent" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {hasAnswered && (
                  <div
                    className={cx(
                      'mt-3 rounded-2xl px-3.5 py-2.5 text-xs',
                      isCorrect ? 'bg-cozy-matcha/20 text-cozy-text' : 'bg-cozy-peach/20 text-cozy-text'
                    )}
                  >
                    <p className="font-bold">
                      {isCorrect
                        ? '🎉 Chính xác! Bạn nắm bài rất chắc!'
                        : `💡 Chưa đúng rồi — Đáp án đúng là ${String.fromCharCode(65 + q.correctIndex)}.`}
                    </p>
                    {q.explanation && <p className="mt-1 text-cozy-text/90">{q.explanation}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

