// (2) Khu vực Học tập + Gemini (Study Hub) - PROJECT_RULES.md mục IV.1
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  ArrowLeft,
  FileText,
  Upload,
  Trash2,
  Pencil,
  Check,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  CheckCircle2,
  XCircle,
  Wand2,
  ExternalLink,
  RefreshCw,
  Copy,
  Layers,
  HelpCircle,
  Send,
} from 'lucide-react';
import { Card, Button, Input, PageHeader, IconButton, Modal, cx } from '../components/ui.jsx';
import { ImageSlot } from '../components/ImageSlot.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SubjectCoverSvg } from '../assets/defaultSvgs.jsx';
import { STORAGE_KEYS, useCozyStorage } from '../lib/storage.js';
import { uid, formatRelativeTime } from '../lib/utils.js';
import { attachGeminiWebviewCssInjector } from '../lib/geminiWebviewStyle.js';

export const SUBJECT_COLORS = [
  { id: 'peach', label: 'Hồng đào', bg: '#F4ACB7', soft: '#FFF9F9' },
  { id: 'matcha', label: 'Matcha', bg: '#A3C9A8', soft: '#EEF6EF' },
  { id: 'lavender', label: 'Oải hương', bg: '#E2D4F0', soft: '#F6F1FB' },
  { id: 'butter', label: 'Vàng bơ', bg: '#FFF3B0', soft: '#FFFDF0' },
];

// Xây dựng câu lệnh Prompt cho 3 nút Smart Bridge
function buildSmartPrompt(kind, material) {
  const title = material?.title || 'Bài học';
  const raw = (material?.content || '').trim();
  const excerpt = raw
    ? raw.slice(0, 8000)
    : `Chủ đề: "${title}". (Tài liệu hiện đang trống, hãy tạo nội dung mẫu sát với chủ đề này).`;

  if (kind === 'summary') {
    return `Hãy tóm tắt ngắn gọn, súc tích các ý chính, công thức/khái niệm quan trọng và từ khóa cần nhớ của bài học "${title}" dưới đây bằng tiếng Việt dễ hiểu:\n\n---\n${excerpt}`;
  }

  if (kind === 'flashcard') {
    return `Dựa trên tài liệu "${title}" bên dưới, hãy tạo từ 6 đến 10 thẻ Flashcard ôn tập trọng tâm.
BẮT BUỘC CHỈ trả lời đúng một khối JSON hợp lệ theo mẫu sau (không thêm lời dẫn ngoài JSON):
\`\`\`json
{
  "flashcards": [
    { "front": "Câu hỏi hoặc thuật ngữ ngắn gọn", "back": "Định nghĩa / câu trả lời dễ nhớ" }
  ]
}
\`\`\`

Nội dung tài liệu:
---
${excerpt}`;
  }

  return `Dựa trên tài liệu "${title}" bên dưới, hãy tạo từ 5 đến 8 câu hỏi trắc nghiệm (4 lựa chọn A/B/C/D) để kiểm tra mức độ hiểu bài.
BẮT BUỘC CHỈ trả lời đúng một khối JSON hợp lệ theo mẫu sau (correctIndex là số thứ tự đáp án đúng từ 0 đến 3, không thêm lời dẫn ngoài JSON):
\`\`\`json
{
  "quizzes": [
    {
      "question": "Nội dung câu hỏi?",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctIndex": 0,
      "explanation": "Giải thích ngắn gọn vì sao đáp án này đúng"
    }
  ]
}
\`\`\`

Nội dung tài liệu:
---
${excerpt}`;
}

// Tạo dữ liệu phản hồi mẫu thông minh dựa trên chính nội dung tài liệu (cho môi trường Preview trình duyệt)
function generateSimulatedResponse(kind, material) {
  const title = material?.title || 'Bài học';
  const text = (material?.content || '').trim();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•#\d.)\s]+/, '').trim())
    .filter((l) => l.length > 6);

  if (kind === 'summary') {
    const bullets = (lines.length ? lines.slice(0, 6) : [
      `Khái niệm cốt lõi và định nghĩa quan trọng của ${title}.`,
      `Các đặc điểm, tính chất và phân loại chính cần lưu ý.`,
      `Ứng dụng thực tế và dạng bài tập thường gặp trong ${title}.`,
    ])
      .map((l) => `• ${l.slice(0, 140)}`)
      .join('\n');
    return `✨ **Tóm tắt bài học: ${title}**\n\n${bullets}\n\n💡 *Mẹo ôn tập:* Hãy bấm **[🎴 Tạo Flashcard]** hoặc **[📝 Tạo câu hỏi Quiz]** rồi nhấn nút **[🪄 Nhập câu trả lời vào Phòng Ôn tập]** để luyện tập ngay ở cột bên trái nhé!`;
  }

  // Tách cặp định nghĩa kiểu "Thuật ngữ: Giải thích" hoặc "Thuật ngữ - Giải thích" nếu có
  const pairs = [];
  lines.forEach((l) => {
    const m = l.match(/^([^:–—-]{2,60})\s*[:–—-]\s*(.{4,})$/);
    if (m) pairs.push({ front: m[1].trim(), back: m[2].trim() });
  });

  if (kind === 'flashcard') {
    const cards =
      pairs.length >= 2
        ? pairs.slice(0, 8)
        : lines.length >= 2
          ? lines.slice(0, 6).map((l, idx) => ({
              front: `Ý trọng tâm #${idx + 1} của "${title}" là gì?`,
              back: l,
            }))
          : [
              { front: `${title} là gì?`, back: `Khái niệm nền tảng và ý nghĩa trọng tâm của ${title}.` },
              { front: `Từ khóa quan trọng nhất trong ${title}`, back: `Ghi nhớ định nghĩa, công thức và ví dụ minh họa của ${title}.` },
              { front: `Khi ôn tập ${title} cần lưu ý điều gì?`, back: `Nắm chắc bản chất, phân biệt các trường hợp dễ nhầm lẫn và làm bài Quiz kiểm tra.` },
            ];
    return '```json\n' + JSON.stringify({ flashcards: cards }, null, 2) + '\n```';
  }

  const baseItems =
    pairs.length >= 1
      ? pairs.slice(0, 5)
      : lines.slice(0, 4).map((l, i) => ({ front: `Nội dung trọng tâm #${i + 1} trong "${title}"`, back: l }));

  const quizzes = (baseItems.length
    ? baseItems
    : [
        { front: `Đâu là mô tả đúng nhất về "${title}"?`, back: `Là nội dung cốt lõi cần nắm vững trong bài ${title}.` },
        { front: `Phương pháp hiệu quả để ghi nhớ "${title}" là gì?`, back: `Kết hợp đọc tài liệu, lật thẻ Flashcard 3D và làm trắc nghiệm Quiz.` },
      ]
  ).map((item, idx) => {
    const correctIndex = idx % 4;
    const distractors = [
      'Một khái niệm không liên quan trực tiếp đến nội dung bài học.',
      'Phương án gây nhiễu dùng để kiểm tra độ chính xác khi đọc bài.',
      'Thông tin phụ, không phải định nghĩa hoặc kết luận chính xác.',
    ];
    const options = [];
    let dIdx = 0;
    for (let i = 0; i < 4; i += 1) {
      options.push(i === correctIndex ? item.back : distractors[dIdx++]);
    }
    return {
      question: item.front.endsWith('?') ? item.front : ` Phát biểu nào sau đây đúng về: "${item.front}"?`,
      options,
      correctIndex,
      explanation: `Theo tài liệu "${title}": ${item.back}`,
    };
  });

  return '```json\n' + JSON.stringify({ quizzes }, null, 2) + '\n```';
}

/**
 * Bộ phân tích câu trả lời của Gemini (hỗ trợ cả ```json ... ```, JSON thuần,
 * lẫn văn bản "Q: ... / A: ..." hoặc danh sách gạch đầu dòng).
 */
export function parseGeminiStudyPayload(rawText) {
  if (!rawText || !String(rawText).trim()) {
    return { flashcards: [], quizzes: [], error: 'Chưa có nội dung câu trả lời để nhập.' };
  }
  const cleaned = String(rawText)
    .replace(/```(?:json|javascript|js)?/gi, '')
    .replace(/```/g, '')
    .trim();

  const tryParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  let data = tryParse(cleaned);
  if (!data) {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (objMatch) data = tryParse(objMatch[0]);
    if (!data && arrMatch) data = tryParse(arrMatch[0]);
  }

  const normalizeFlashcard = (c) => {
    if (!c || typeof c !== 'object') return null;
    const front = String(c.front ?? c.question ?? c.term ?? c.q ?? '').trim();
    const back = String(c.back ?? c.answer ?? c.definition ?? c.a ?? '').trim();
    if (!front || !back) return null;
    return { front, back, known: Boolean(c.known) };
  };

  const normalizeQuiz = (q) => {
    if (!q || typeof q !== 'object') return null;
    const question = String(q.question ?? q.q ?? q.prompt ?? '').trim();
    const rawOpts = Array.isArray(q.options ?? q.choices ?? q.answers) ? q.options ?? q.choices ?? q.answers : [];
    const options = rawOpts.map((o) => String(o).replace(/^[A-D][.)]\s*/i, '').trim()).filter(Boolean);
    if (!question || options.length < 2) return null;
    let correctIndex = Number(q.correctIndex ?? q.answerIndex ?? q.correct ?? 0);
    if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = 0;
    }
    const explanation = String(q.explanation ?? q.reason ?? q.note ?? '').trim();
    return { question, options, correctIndex, explanation };
  };

  let flashcards = [];
  let quizzes = [];

  if (data) {
    const list = Array.isArray(data) ? data : [];
    const fcSource = Array.isArray(data.flashcards) ? data.flashcards : list;
    const qzSource = Array.isArray(data.quizzes) ? data.quizzes : Array.isArray(data.questions) ? data.questions : list;
    flashcards = fcSource.map(normalizeFlashcard).filter(Boolean);
    quizzes = qzSource.map(normalizeQuiz).filter(Boolean);
  }

  // Fallback: nếu người dùng dán văn bản dạng "Mặt trước: ... / Mặt sau: ..." hoặc "Term - Definition"
  if (flashcards.length === 0 && quizzes.length === 0) {
    const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i += 1) {
      const pair = lines[i].match(/^(?:[-*•]|\d+[.)])?\s*([^:–—-]{2,80})\s*[:–—-]\s*(.{3,})$/);
      if (pair) {
        flashcards.push({ front: pair[1].trim(), back: pair[2].trim(), known: false });
      }
    }
  }

  if (flashcards.length === 0 && quizzes.length === 0) {
    return {
      flashcards: [],
      quizzes: [],
      error: 'Không tìm thấy dữ liệu Flashcard hoặc Quiz hợp lệ. Hãy bấm nút [🎴 Tạo Flashcard] hoặc [📝 Tạo câu hỏi Quiz] để Gemini trả lời đúng chuẩn JSON nhé!',
    };
  }
  return { flashcards, quizzes, error: null };
}

// ============================================================
// CỘT TRÁI - TAB 2: FLASHCARD 3D
// ============================================================
function FlashcardDeck({ flashcards = [], onChange }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const total = flashcards.length;
  const safeIndex = total ? Math.min(index, total - 1) : 0;
  const current = flashcards[safeIndex];
  const knownCount = flashcards.filter((c) => c.known).length;

  useEffect(() => {
    setFlipped(false);
  }, [safeIndex, total]);

  const toggleKnown = () => {
    if (!current) return;
    const next = flashcards.map((c, i) => (i === safeIndex ? { ...c, known: !c.known } : c));
    onChange(next);
  };

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
  };

  const removeCurrent = () => {
    if (!current) return;
    onChange(flashcards.filter((_, i) => i !== safeIndex));
    setIndex((i) => Math.max(0, i - 1));
  };

  const addManualCard = () => {
    if (!front.trim() || !back.trim()) return;
    const next = [...flashcards, { front: front.trim(), back: back.trim(), known: false }];
    onChange(next);
    setFront('');
    setBack('');
    setAdding(false);
    setIndex(next.length - 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-cozy-blush px-3 py-1 text-cozy-text ring-1 ring-cozy-line">
            Tổng {total} thẻ
          </span>
          <span className="rounded-full bg-cozy-matcha/25 px-3 py-1 text-cozy-text">
            Đã thuộc {knownCount}/{total}
          </span>
        </div>
        <div className="flex gap-1.5">
          {total > 1 && (
            <Button variant="soft" size="sm" onClick={shuffleDeck}>
              <Shuffle size={14} /> Trộn thẻ
            </Button>
          )}
          <Button variant="soft" size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus size={14} /> Thêm thẻ
          </Button>
        </div>
      </div>

      {adding && (
        <div className="space-y-2 rounded-2xl border border-cozy-line bg-cozy-blush p-3 animate-pop-in">
          <Input placeholder="Mặt trước (câu hỏi / thuật ngữ)..." value={front} onChange={(e) => setFront(e.target.value)} />
          <Input
            placeholder="Mặt sau (đáp án / giải nghĩa)..."
            value={back}
            onChange={(e) => setBack(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addManualCard()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={addManualCard} disabled={!front.trim() || !back.trim()}>
              Lưu thẻ
            </Button>
          </div>
        </div>
      )}

      {total === 0 ? (
        <EmptyState
          title="Chưa có thẻ Flashcard nào"
          hint="Bấm [🎴 Tạo Flashcard] ở khung Gemini bên phải rồi nhấn [🪄 Nhập câu trả lời vào Phòng Ôn tập], hoặc tự thêm thẻ mới."
          size="w-36"
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
              <div className="absolute inset-0 flex flex-col justify-between rounded-3xl border-2 border-cozy-line bg-gradient-to-br from-white to-cozy-blush p-6 shadow-sm [backface-visibility:hidden]">
                <div className="flex items-center justify-between text-xs font-semibold text-cozy-muted">
                  <span>🎴 MẶT TRƯỚC · Thẻ {safeIndex + 1}/{total}</span>
                  {current.known && (
                    <span className="rounded-full bg-cozy-matcha/30 px-2.5 py-0.5 text-cozy-text">✓ Đã thuộc</span>
                  )}
                </div>
                <p className="my-auto text-center text-lg font-bold leading-relaxed text-cozy-text">
                  {current.front}
                </p>
                <p className="flex items-center justify-center gap-1.5 text-xs text-cozy-muted">
                  <RotateCw size={13} /> Bấm vào thẻ để lật xem đáp án
                </p>
              </div>

              {/* Mặt sau */}
              <div className="absolute inset-0 flex flex-col justify-between rounded-3xl border-2 border-cozy-peach/60 bg-gradient-to-br from-cozy-butter/50 to-white p-6 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="flex items-center justify-between text-xs font-semibold text-cozy-muted">
                  <span>✨ MẶT SAU · Đáp án</span>
                  <span>Thẻ {safeIndex + 1}/{total}</span>
                </div>
                <p className="my-auto whitespace-pre-wrap text-center text-base font-semibold leading-relaxed text-cozy-text">
                  {current.back}
                </p>
                <p className="flex items-center justify-center gap-1.5 text-xs text-cozy-muted">
                  <RotateCw size={13} /> Bấm để lật lại mặt trước
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

            <div className="flex items-center gap-2">
              <Button
                variant={current.known ? 'secondary' : 'butter'}
                size="sm"
                onClick={toggleKnown}
              >
                <Check size={15} /> {current.known ? 'Đã thuộc lòng' : 'Đánh dấu đã thuộc'}
              </Button>
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

// ============================================================
// CỘT TRÁI - TAB 3: TRẮC NGHIỆM QUIZ (A/B/C/D, báo đúng/sai, tính điểm)
// ============================================================
function QuizArena({ quizzes = [], onChange }) {
  const [answers, setAnswers] = useState({}); // { [qIndex]: optionIndex }
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  });

  const total = quizzes.length;
  const answeredCount = Object.keys(answers).length;
  const correctCount = quizzes.reduce(
    (sum, q, idx) => sum + (answers[idx] !== undefined && answers[idx] === q.correctIndex ? 1 : 0),
    0
  );
  const score10 = total ? Math.round((correctCount / total) * 100) / 10 : 0;

  const selectOption = (qIdx, optIdx) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const resetQuiz = () => setAnswers({});

  const deleteQuestion = (qIdx) => {
    onChange(quizzes.filter((_, i) => i !== qIdx));
    setAnswers({});
  };

  const addManualQuiz = () => {
    const question = draft.question.trim();
    const opts = draft.options.map((o) => o.trim()).filter(Boolean);
    if (!question || opts.length < 2) return;
    onChange([
      ...quizzes,
      {
        question,
        options: opts,
        correctIndex: Math.min(draft.correctIndex, opts.length - 1),
        explanation: draft.explanation.trim(),
      },
    ]);
    setDraft({ question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' });
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Thanh điểm số */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cozy-line bg-cozy-blush px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="rounded-full bg-white px-3 py-1 text-cozy-text ring-1 ring-cozy-line">
            Đã làm {answeredCount}/{total} câu
          </span>
          <span className="rounded-full bg-cozy-matcha/30 px-3 py-1 text-cozy-text">
            Đúng {correctCount}/{total}
          </span>
          {total > 0 && (
            <span className="rounded-full bg-cozy-butter px-3 py-1 font-bold text-cozy-text">
              🏆 Điểm: {score10}/10
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {answeredCount > 0 && (
            <Button variant="soft" size="sm" onClick={resetQuiz}>
              Làm lại
            </Button>
          )}
          <Button variant="soft" size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus size={14} /> Thêm câu hỏi
          </Button>
        </div>
      </div>

      {adding && (
        <div className="space-y-2.5 rounded-2xl border border-cozy-line bg-white p-4 animate-pop-in">
          <Input
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
                    draft.correctIndex === idx ? 'bg-cozy-matcha text-white' : 'bg-cozy-blush text-cozy-muted'
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
            <span className="text-xs text-cozy-muted">Bấm vào chữ A/B/C/D màu xanh để đánh dấu đáp án đúng</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Hủy
              </Button>
              <Button size="sm" onClick={addManualQuiz}>
                Lưu câu hỏi
              </Button>
            </div>
          </div>
        </div>
      )}

      {total === 0 ? (
        <EmptyState
          title="Chưa có câu hỏi Quiz nào"
          hint="Bấm [📝 Tạo câu hỏi Quiz] ở khung Gemini bên phải rồi nhấn [🪄 Nhập câu trả lời vào Phòng Ôn tập] để tạo đề trắc nghiệm tự động!"
          size="w-36"
        />
      ) : (
        <div className="cozy-scroll max-h-[500px] space-y-4 overflow-y-auto pr-1">
          {quizzes.map((q, qIdx) => {
            const chosen = answers[qIdx];
            const hasAnswered = chosen !== undefined;
            const isCorrect = hasAnswered && chosen === q.correctIndex;
            return (
              <div key={qIdx} className="rounded-3xl border border-cozy-line bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="font-bold text-cozy-text">
                    <span className="mr-2 rounded-xl bg-cozy-lavender px-2.5 py-0.5 text-xs">
                      Câu {qIdx + 1}
                    </span>
                    {q.question}
                  </p>
                  <IconButton title="Xóa câu này" onClick={() => deleteQuestion(qIdx)}>
                    <Trash2 size={14} />
                  </IconButton>
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
                        toneClass = 'border-cozy-line bg-white opacity-65';
                      }
                    }
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => selectOption(qIdx, optIdx)}
                        className={cx(
                          'flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-sm text-cozy-text transition',
                          toneClass
                        )}
                      >
                        <span
                          className={cx(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                            hasAnswered && isThisCorrect
                              ? 'bg-cozy-matcha text-white'
                              : hasAnswered && isThisChosen
                                ? 'bg-cozy-peach text-white'
                                : 'bg-white text-cozy-text ring-1 ring-cozy-line'
                          )}
                        >
                          {letter}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {hasAnswered && isThisCorrect && (
                          <CheckCircle2 size={17} className="shrink-0 text-cozy-matcha" />
                        )}
                        {hasAnswered && isThisChosen && !isThisCorrect && (
                          <XCircle size={17} className="shrink-0 text-cozy-peach" />
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
                        ? '🎉 Chính xác! Bạn giỏi quá!'
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

// ============================================================
// CỘT PHẢI (45%): KHUNG NHÚNG GEMINI + SMART BRIDGE (TỐI GIẢN TỐI ĐA CHO VÙNG TRẢ LỜI)
// ============================================================
function GeminiBridgePane({ material, onImportStudyData }) {
  const isElectron = Boolean(typeof window !== 'undefined' && window.cozyEnv?.isElectron);
  const [bridgeMode, setBridgeMode] = useState(() => (isElectron ? 'webview' : 'dual')); // 'webview' | 'dual'
  const webviewRef = useRef(null);
  const popupRef = useRef(null);
  const [promptBox, setPromptBox] = useState('');
  const [replyBox, setReplyBox] = useState('');
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [banner, setBanner] = useState(null); // { tone, text }

  const showNotice = (text, tone = 'matcha') => {
    setBanner({ text, tone });
    setTimeout(() => setBanner((b) => (b?.text === text ? null : b)), 4500);
  };

  // Khi ở Chế độ Nhúng Webview: lắng nghe dom-ready và tiêm CSS Cozy Pastel
  useEffect(() => {
    if (bridgeMode !== 'webview' || !webviewRef.current) return undefined;
    return attachGeminiWebviewCssInjector(webviewRef.current);
  }, [bridgeMode]);

  // Tự động tải lại <webview> ngay khi đăng nhập Google qua trình duyệt Chrome thật hoàn tất
  useEffect(() => {
    if (!isElectron || typeof window.cozyEnv?.onGeminiAuthCompleted !== 'function') return undefined;
    return window.cozyEnv.onGeminiAuthCompleted(() => {
      webviewRef.current?.loadURL?.('https://gemini.google.com/app');
      showNotice('🎉 Đăng nhập Google thành công! Đã đồng bộ tài khoản vào khung Gemini.');
    });
  }, [isElectron]);

  // Mở (hoặc focus) cửa sổ đôi Gemini căn lề phải màn hình & tự động Copy câu lệnh vào Clipboard
  const openOrFocusDualPopup = async (promptToCopy = promptBox) => {
    const cleanPrompt = String(promptToCopy || '').trim();
    if (cleanPrompt) {
      try {
        await navigator.clipboard.writeText(cleanPrompt);
      } catch {
        /* bỏ qua */
      }
    }

    if (!popupRef.current || popupRef.current.closed) {
      popupRef.current = window.open(
        'https://gemini.google.com/app',
        'CozyGeminiPopup',
        'width=520,height=850,left=900,top=50,menubar=no,toolbar=no,location=yes,status=no'
      );
    } else {
      popupRef.current.focus();
    }
  };

  // Xử lý khi bấm 3 nút Smart Bridge: [✨ Tóm tắt bài], [🎴 Tạo Flashcard], [📝 Tạo câu hỏi Quiz]
  const sendPromptToGemini = async (kind) => {
    const prompt = buildSmartPrompt(kind, material);
    setPromptBox(prompt);

    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      /* bỏ qua */
    }

    if (bridgeMode === 'webview' && webviewRef.current) {
      try {
        const escaped = JSON.stringify(prompt);
        if (typeof webviewRef.current.executeJavaScript === 'function') {
          await webviewRef.current.executeJavaScript(`
            (function() {
              const box = document.querySelector('rich-textarea .ql-editor, rich-textarea [contenteditable="true"], textarea');
              if (box) {
                box.focus();
                if (box.tagName === 'TEXTAREA') {
                  box.value = ${escaped};
                  box.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                  try {
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, ${escaped});
                  } catch (e) {
                    box.textContent = ${escaped};
                  }
                  box.dispatchEvent(new InputEvent('input', { bubbles: true }));
                }
                setTimeout(() => {
                  const sendBtn = document.querySelector('button.send-button, .send-button-container button, button[aria-label*="Gửi" i], button[aria-label*="Send" i]');
                  if (sendBtn && !sendBtn.disabled) sendBtn.click();
                }, 180);
                return true;
              }
              return false;
            })();
          `);
          showNotice('✨ Đã gửi câu lệnh vào Gemini!');
          return;
        }
      } catch {
        /* rơi xuống thông báo clipboard */
      }
      showNotice('Đã sao chép Prompt vào Clipboard! Nhấn Ctrl+V vào ô chat Gemini nhé.');
      return;
    }

    await openOrFocusDualPopup(prompt);
    showNotice('📋 Đã mở cửa sổ đôi Gemini & Copy sẵn câu lệnh (Ctrl + V để gửi)!');
  };

  // Đọc câu trả lời từ Gemini webview hoặc từ hộp văn bản / Clipboard rồi lưu vào cozy_study_sets
  const handleImportReply = async () => {
    let source = replyBox.trim();

    if (!source && bridgeMode === 'webview' && webviewRef.current && typeof webviewRef.current.executeJavaScript === 'function') {
      try {
        const extracted = await webviewRef.current.executeJavaScript(`
          (function() {
            const nodes = document.querySelectorAll('code, message-content, .model-response-text');
            if (!nodes.length) return '';
            for (let i = nodes.length - 1; i >= 0; i--) {
              const txt = (nodes[i].innerText || '').trim();
              if (txt.includes('"flashcards"') || txt.includes('"quizzes"') || txt.startsWith('{')) {
                return txt;
              }
            }
            return nodes[nodes.length - 1].innerText || '';
          })();
        `);
        if (extracted && String(extracted).trim()) {
          source = String(extracted).trim();
          setReplyBox(source);
        }
      } catch {
        /* rơi xuống clipboard */
      }
    }

    if (!source) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim()) {
          source = clip.trim();
          setReplyBox(source);
        }
      } catch {
        /* bỏ qua */
      }
    }

    const result = parseGeminiStudyPayload(source);
    if (result.error) {
      showNotice(result.error, 'peach');
      return;
    }

    onImportStudyData(result);
    showNotice(
      `🎉 Đã nhập ${result.flashcards.length} Flashcard & ${result.quizzes.length} câu Quiz vào Phòng Ôn tập!`
    );
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden p-2.5">
      {/* Thanh công cụ 1 dòng siêu gọn trên đỉnh để nhường tối đa không gian cho câu trả lời Gemini */}
      <div className="mb-1.5 flex shrink-0 items-center justify-between gap-1">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => sendPromptToGemini('summary')}
            title="Tóm tắt tài liệu đang chọn bằng Gemini"
            className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-cozy-line bg-cozy-blush px-2 py-1 text-[11px] font-bold text-cozy-text transition hover:bg-cozy-butter/70 active:scale-[0.98]"
          >
            ✨ Tóm tắt
          </button>
          <button
            type="button"
            onClick={() => sendPromptToGemini('flashcard')}
            title="Tạo bộ thẻ Flashcard JSON từ tài liệu"
            className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-cozy-line bg-cozy-blush px-2 py-1 text-[11px] font-bold text-cozy-text transition hover:bg-cozy-peach/25 active:scale-[0.98]"
          >
            🎴 Flashcard
          </button>
          <button
            type="button"
            onClick={() => sendPromptToGemini('quiz')}
            title="Tạo bộ câu hỏi trắc nghiệm Quiz JSON từ tài liệu"
            className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-cozy-line bg-cozy-blush px-2 py-1 text-[11px] font-bold text-cozy-text transition hover:bg-cozy-matcha/30 active:scale-[0.98]"
          >
            📝 Quiz
          </button>
          <button
            type="button"
            onClick={handleImportReply}
            title="Đọc câu trả lời JSON của Gemini và lưu thẳng vào tab Flashcard / Quiz bên trái"
            className="flex items-center gap-1 whitespace-nowrap rounded-xl bg-cozy-peach px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
          >
            <Wand2 size={12} /> Nhập vào Ôn tập
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {bridgeMode === 'webview' && (
            <IconButton
              title="Tải lại Gemini"
              onClick={() => webviewRef.current?.reload?.()}
            >
              <RefreshCw size={13} />
            </IconButton>
          )}
          <button
            type="button"
            onClick={() => setShowToolsDrawer((v) => !v)}
            title="Mở/đóng các tùy chọn phụ (Đăng nhập Google, Dán JSON thủ công, Cửa sổ rời)"
            className={cx(
              'rounded-xl border px-2 py-1 text-[11px] font-bold transition',
              showToolsDrawer
                ? 'border-cozy-peach bg-cozy-blush text-cozy-text'
                : 'border-cozy-line bg-white text-cozy-muted hover:text-cozy-text'
            )}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Khay tùy chọn phụ: MẶC ĐỊNH ẨN để không chiếm chỗ của Gemini, chỉ hiện khi bấm nút ⚙️ */}
      {showToolsDrawer && (
        <div className="mb-2 shrink-0 space-y-2 rounded-2xl border border-cozy-line bg-cozy-blush/70 p-2.5 text-xs animate-pop-in">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {isElectron && (
                <Button
                  variant="soft"
                  size="sm"
                  className="px-2.5 py-1 text-[11px]"
                  onClick={async () => {
                    showNotice('Đang mở Google Chrome thật để đăng nhập an toàn...');
                    const res = await window.cozyEnv?.openGeminiSignIn?.();
                    if (res?.ok) {
                      webviewRef.current?.loadURL?.('https://gemini.google.com/app');
                    }
                  }}
                >
                  🔑 Đăng nhập Google
                </Button>
              )}
              <Button
                variant="soft"
                size="sm"
                className="px-2.5 py-1 text-[11px]"
                onClick={() => openOrFocusDualPopup(promptBox)}
              >
                <ExternalLink size={12} /> Mở cửa sổ rời
              </Button>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-cozy-line bg-white p-0.5">
              <button
                type="button"
                onClick={() => setBridgeMode('webview')}
                className={cx(
                  'rounded-lg px-2 py-0.5 text-[10px] font-bold transition',
                  bridgeMode === 'webview' ? 'bg-cozy-peach text-white' : 'text-cozy-muted'
                )}
              >
                Nhúng Webview
              </button>
              <button
                type="button"
                onClick={() => setBridgeMode('dual')}
                className={cx(
                  'rounded-lg px-2 py-0.5 text-[10px] font-bold transition',
                  bridgeMode === 'dual' ? 'bg-cozy-peach text-white' : 'text-cozy-muted'
                )}
              >
                Cửa sổ đôi
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-cozy-muted">
              <span>📥 Dán câu trả lời JSON thủ công (tùy chọn):</span>
              {replyBox && (
                <button
                  type="button"
                  onClick={() => setReplyBox('')}
                  className="text-[11px] font-semibold text-cozy-muted hover:text-cozy-peach"
                >
                  Xóa ô
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={replyBox}
              onChange={(e) => setReplyBox(e.target.value)}
              placeholder="Để trống để tự động lấy câu trả lời mới nhất từ Gemini, hoặc dán JSON vào đây..."
              className="cozy-scroll w-full resize-none rounded-xl border border-cozy-line bg-white p-2 font-mono text-xs text-cozy-text outline-none focus:border-cozy-peach"
            />
          </div>
        </div>
      )}

      {banner && (
        <div
          className={cx(
            'mb-1.5 shrink-0 rounded-xl px-3 py-1 text-[11px] font-semibold animate-pop-in',
            banner.tone === 'peach' ? 'bg-cozy-peach/25 text-cozy-text' : 'bg-cozy-matcha/25 text-cozy-text'
          )}
        >
          {banner.text}
        </div>
      )}

      {/* Khung chính Gemini chiếm trọn toàn bộ chiều cao còn lại (không còn thanh chắn ở đáy) */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-cozy-peach/60 bg-cozy-bg">
        {bridgeMode === 'webview' ? (
          <div className="relative flex h-full w-full flex-1 flex-col">
            <webview
              ref={webviewRef}
              id="gemini-webview"
              src="https://gemini.google.com/app"
              partition="persist:gemini"
              className="h-full w-full flex-1"
              style={{ width: '100%', height: '100%', flex: '1 1 0%' }}
              allowpopups="true"
            />
            {!isElectron && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border border-cozy-line bg-white/95 p-3 text-center text-xs text-cozy-muted shadow-sm">
                💡 Thẻ <code className="font-mono text-cozy-text">&lt;webview&gt;</code> chỉ hiển thị trực tiếp khi chạy bằng Electron (<code className="font-mono text-cozy-text">npm run electron:dev</code>).
              </div>
            )}
          </div>
        ) : (
          <div className="cozy-scroll flex h-full flex-1 flex-col justify-between gap-3 overflow-y-auto p-3.5">
            <div className="space-y-2.5 rounded-2xl border border-cozy-line bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-cozy-butter px-3 py-1 text-xs font-bold text-cozy-text">
                  🪟 Cửa sổ đôi Gemini (520×850 · Căn lề phải)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = generateSimulatedResponse('flashcard', material);
                    setReplyBox(sample);
                    setShowToolsDrawer(true);
                    showNotice('Đã tạo nhanh bộ JSON mẫu từ tài liệu!');
                  }}
                  className="text-[11px] font-bold text-cozy-peach hover:underline"
                >
                  ⚡ Tạo JSON mẫu offline
                </button>
              </div>

              <ol className="list-inside list-decimal space-y-1 text-xs leading-relaxed text-cozy-text">
                <li>
                  Bấm <b>[✨ Tóm tắt]</b>, <b>[🎴 Flashcard]</b>, <b>[📝 Quiz]</b> ở thanh trên cùng.
                </li>
                <li>
                  Ứng dụng sẽ <b>mở cửa sổ Gemini thật</b> căn lề phải màn hình và <b>Copy sẵn câu lệnh vào Clipboard</b>.
                </li>
                <li>
                  Nhấn <kbd className="rounded bg-cozy-blush px-1.5 py-0.5 font-mono">Ctrl + V</kbd> trong Gemini để gửi, sau đó copy câu trả lời và bấm <b>[🪄 Nhập vào Ôn tập]</b>!
                </li>
              </ol>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-cozy-muted">
                  <span>Câu lệnh Prompt hiện tại:</span>
                  {promptBox && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(promptBox);
                        showNotice('Đã sao chép lại Prompt vào Clipboard!');
                      }}
                      className="inline-flex items-center gap-1 text-cozy-peach hover:underline"
                    >
                      <Copy size={12} /> Copy lại
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={promptBox}
                  onChange={(e) => setPromptBox(e.target.value)}
                  placeholder="Bấm 1 trong 3 nút [✨ Tóm tắt] / [🎴 Flashcard] / [📝 Quiz] ở trên, hoặc tự gõ câu hỏi cho Gemini tại đây..."
                  className="cozy-scroll w-full resize-none rounded-2xl border border-cozy-line bg-cozy-bg p-2.5 text-xs leading-relaxed text-cozy-text outline-none focus:border-cozy-peach"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// MÀN HÌNH CHÍNH KHU VỰC HỌC TẬP (STUDY HUB)
// ============================================================
export default function StudyHub() {
  const [subjects, setSubjects] = useCozyStorage(STORAGE_KEYS.SUBJECTS);
  const [materials, setMaterials] = useCozyStorage(STORAGE_KEYS.STUDY_MATERIALS);
  const [studySets, setStudySets] = useCozyStorage(STORAGE_KEYS.STUDY_SETS);

  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [activeTab, setActiveTab] = useState('materials'); // materials | flashcards | quizzes
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);

  // Modal tạo/sửa môn học
  const [subjectModal, setSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState(SUBJECT_COLORS[0].bg);

  const fileInputRef = useRef(null);

  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === activeSubjectId) || null,
    [subjects, activeSubjectId]
  );

  const subjectMaterials = useMemo(
    () =>
      materials
        .filter((m) => m.subjectId === activeSubjectId)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [materials, activeSubjectId]
  );

  // Tự chọn tài liệu đầu tiên khi mở môn học
  useEffect(() => {
    if (!activeSubjectId) return;
    if (!subjectMaterials.some((m) => m.id === selectedMaterialId)) {
      setSelectedMaterialId(subjectMaterials[0]?.id || null);
    }
  }, [activeSubjectId, subjectMaterials, selectedMaterialId]);

  const currentMaterial = useMemo(
    () => subjectMaterials.find((m) => m.id === selectedMaterialId) || null,
    [subjectMaterials, selectedMaterialId]
  );

  const currentStudySet = useMemo(
    () =>
      studySets.find((s) => s.subjectId === activeSubjectId) || {
        id: `set_${activeSubjectId}`,
        subjectId: activeSubjectId,
        flashcards: [],
        quizzes: [],
      },
    [studySets, activeSubjectId]
  );

  const updateStudySet = (updater) => {
    if (!activeSubjectId) return;
    setStudySets((prev) => {
      const exists = prev.find((s) => s.subjectId === activeSubjectId);
      if (exists) {
        return prev.map((s) => (s.subjectId === activeSubjectId ? updater(s) : s));
      }
      const created = updater({
        id: uid(),
        subjectId: activeSubjectId,
        flashcards: [],
        quizzes: [],
      });
      return [...prev, created];
    });
  };

  // Thêm/sửa môn học
  const openCreateSubject = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectColor(SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length].bg);
    setSubjectModal(true);
  };

  const openEditSubject = (subj, e) => {
    e?.stopPropagation?.();
    setEditingSubject(subj);
    setSubjectName(subj.name);
    setSubjectColor(subj.color || SUBJECT_COLORS[0].bg);
    setSubjectModal(true);
  };

  const saveSubject = () => {
    const name = subjectName.trim();
    if (!name) return;
    if (editingSubject) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === editingSubject.id ? { ...s, name, color: subjectColor } : s))
      );
    } else {
      const id = uid();
      const newSubj = {
        id,
        name,
        color: subjectColor,
        coverSlotId: 'subject_default_cover',
        createdAt: Date.now(),
      };
      setSubjects((prev) => [...prev, newSubj]);
      // Tạo sẵn 1 tài liệu mở đầu để người dùng có thể gõ ngay
      const matId = uid();
      setMaterials((prev) => [
        ...prev,
        {
          id: matId,
          subjectId: id,
          title: `Ghi chú bài 1 - ${name}`,
          content: '',
          type: 'note',
          updatedAt: Date.now(),
        },
      ]);
      setStudySets((prev) => [
        ...prev,
        { id: uid(), subjectId: id, flashcards: [], quizzes: [] },
      ]);
    }
    setSubjectModal(false);
  };

  const deleteSubject = (subj, e) => {
    e?.stopPropagation?.();
    if (!window.confirm(`Xóa môn "${subj.name}" cùng toàn bộ tài liệu, Flashcard và Quiz của môn này?`)) return;
    setSubjects((prev) => prev.filter((s) => s.id !== subj.id));
    setMaterials((prev) => prev.filter((m) => m.subjectId !== subj.id));
    setStudySets((prev) => prev.filter((s) => s.subjectId !== subj.id));
    if (activeSubjectId === subj.id) setActiveSubjectId(null);
  };

  // Quản lý tài liệu trong môn học
  const createNoteMaterial = () => {
    if (!activeSubjectId) return;
    const id = uid();
    const next = {
      id,
      subjectId: activeSubjectId,
      title: `Bài ghi chú #${subjectMaterials.length + 1}`,
      content: '',
      type: 'note',
      updatedAt: Date.now(),
    };
    setMaterials((prev) => [next, ...prev]);
    setSelectedMaterialId(id);
    setActiveTab('materials');
  };

  const handleUploadTxtMd = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !activeSubjectId) return;

    const added = [];
    for (const file of files) {
      const text = await file.text();
      added.push({
        id: uid(),
        subjectId: activeSubjectId,
        title: file.name.replace(/\.(txt|md|markdown)$/i, '') || file.name,
        content: text,
        type: 'file',
        updatedAt: Date.now(),
      });
    }
    setMaterials((prev) => [...added, ...prev]);
    setSelectedMaterialId(added[0].id);
    setActiveTab('materials');
  };

  const updateCurrentMaterial = (patch) => {
    if (!currentMaterial) return;
    setMaterials((prev) =>
      prev.map((m) => (m.id === currentMaterial.id ? { ...m, ...patch, updatedAt: Date.now() } : m))
    );
  };

  const deleteMaterial = (id) => {
    if (!window.confirm('Xóa tài liệu này?')) return;
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // Nhận dữ liệu JSON từ Gemini Bridge
  const handleImportFromGemini = ({ flashcards, quizzes }) => {
    updateStudySet((set) => ({
      ...set,
      flashcards: flashcards.length ? [...(set.flashcards || []), ...flashcards] : set.flashcards || [],
      quizzes: quizzes.length ? [...(set.quizzes || []), ...quizzes] : set.quizzes || [],
    }));
    if (flashcards.length > 0) setActiveTab('flashcards');
    else if (quizzes.length > 0) setActiveTab('quizzes');
  };

  // ==========================================================
  // CHẾ ĐỘ 1: KỆ SỔ TAY MÔN HỌC (khi chưa mở môn nào)
  // ==========================================================
  if (!activeSubject) {
    return (
      <div>
        <PageHeader
          emoji="📚"
          title="Khu vực Học tập + Gemini"
          subtitle="Mỗi môn học là một cuốn sổ nhỏ — soạn tài liệu, lật Flashcard 3D và luyện Quiz cùng Gemini"
          right={
            <Button onClick={openCreateSubject}>
              <Plus size={16} /> Thêm môn học
            </Button>
          }
        />

        {subjects.length === 0 ? (
          <Card className="p-10">
            <EmptyState
              title="Kệ sách học tập đang trống"
              hint="Tạo cuốn sổ tay môn học đầu tiên để bắt đầu ghi chép và tạo Flashcard / Quiz tự động với Gemini nhé!"
              size="w-44"
            >
              <Button onClick={openCreateSubject}>
                <Plus size={16} /> Tạo môn học đầu tiên
              </Button>
            </EmptyState>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subj) => {
              const matCount = materials.filter((m) => m.subjectId === subj.id).length;
              const set = studySets.find((s) => s.subjectId === subj.id);
              const fcCount = set?.flashcards?.length || 0;
              const qzCount = set?.quizzes?.length || 0;
              return (
                <Card
                  key={subj.id}
                  onClick={() => {
                    setActiveSubjectId(subj.id);
                    setActiveTab('materials');
                  }}
                  className="group flex cursor-pointer flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative aspect-[3/2] w-full overflow-hidden border-b border-cozy-line">
                    <ImageSlot
                      slotId={subj.coverSlotId || 'subject_default_cover'}
                      defaultSvg={<SubjectCoverSvg />}
                      className="h-full w-full"
                    />
                    <span
                      className="pointer-events-none absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold text-cozy-text shadow-sm backdrop-blur"
                      style={{ backgroundColor: subj.color || '#F4ACB7' }}
                    >
                      {subj.name}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-cozy-text">{subj.name}</h3>
                        <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                          <IconButton title="Đổi tên / màu" onClick={(e) => openEditSubject(subj, e)}>
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton title="Xóa môn học" onClick={(e) => deleteSubject(subj, e)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-cozy-muted">
                        <span className="rounded-full bg-cozy-blush px-2.5 py-0.5">{matCount} tài liệu</span>
                        <span className="rounded-full bg-cozy-butter/70 px-2.5 py-0.5">{fcCount} flashcard</span>
                        <span className="rounded-full bg-cozy-matcha/25 px-2.5 py-0.5">{qzCount} câu quiz</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-cozy-line pt-3 text-xs font-bold text-cozy-peach">
                      <span>Mở phòng học & Gemini</span>
                      <span>→</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Modal
          open={subjectModal}
          onClose={() => setSubjectModal(false)}
          title={editingSubject ? '✏️ Chỉnh sửa môn học' : '📒 Tạo sổ tay môn học mới'}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-cozy-muted">Tên môn học</label>
              <Input
                autoFocus
                placeholder="VD: Tiếng Anh IELTS, Giải tích 1, Lịch sử..."
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveSubject()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-cozy-muted">Màu nhãn môn học</label>
              <div className="flex gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSubjectColor(c.bg)}
                    className={cx(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 py-2 text-xs font-bold text-cozy-text transition',
                      subjectColor === c.bg ? 'border-cozy-text shadow-sm' : 'border-transparent opacity-75 hover:opacity-100'
                    )}
                    style={{ backgroundColor: c.bg }}
                  >
                    {subjectColor === c.bg && <Check size={13} />} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSubjectModal(false)}>
                Hủy
              </Button>
              <Button onClick={saveSubject} disabled={!subjectName.trim()}>
                {editingSubject ? 'Lưu thay đổi' : 'Tạo môn học'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ==========================================================
  // CHẾ ĐỘ 2: BỐ CỤC 2 CỘT KHI MỞ MỘT MÔN HỌC (Trái 55% / Phải 45%)
  // ==========================================================
  return (
    <div className="space-y-4">
      {/* Thanh tiêu đề môn học */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="soft" size="sm" onClick={() => setActiveSubjectId(null)}>
            <ArrowLeft size={15} /> Kệ môn học
          </Button>
          <span
            className="h-4 w-4 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: activeSubject.color || '#F4ACB7' }}
          />
          <h1 className="text-xl font-bold text-cozy-text">{activeSubject.name}</h1>
        </div>

        {/* 3 Tab con của Cột trái */}
        <div className="flex gap-1.5 rounded-2xl border border-cozy-line bg-white p-1 shadow-sm">
          {[
            { id: 'materials', label: 'Tài liệu môn học', icon: FileText, count: subjectMaterials.length },
            {
              id: 'flashcards',
              label: 'Flashcard',
              icon: Layers,
              count: currentStudySet.flashcards?.length || 0,
            },
            {
              id: 'quizzes',
              label: 'Trắc nghiệm Quiz',
              icon: HelpCircle,
              count: currentStudySet.quizzes?.length || 0,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cx(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                activeTab === t.id ? 'bg-cozy-peach text-white shadow-sm' : 'text-cozy-muted hover:text-cozy-text'
              )}
            >
              <t.icon size={14} /> {t.label}
              <span
                className={cx(
                  'rounded-full px-1.5 py-0.2 text-[10px]',
                  activeTab === t.id ? 'bg-white/25 text-white' : 'bg-cozy-blush text-cozy-muted'
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* BỐ CỤC 2 CỘT CÂN ĐỐI CHIỀU CAO: Cột trái 55% | Cột phải 45% */}
      <div className="flex flex-col gap-5 lg:h-[calc(100vh-132px)] lg:min-h-[540px] lg:flex-row lg:items-stretch">
        {/* CỘT TRÁI (55%) */}
        <div className="flex w-full flex-col lg:h-full lg:w-[55%]">
          <Card className="flex h-full flex-col overflow-hidden p-5">
            {activeTab === 'materials' && (
              <div className="flex h-full flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {subjectMaterials.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMaterialId(m.id)}
                        className={cx(
                          'flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold transition',
                          m.id === selectedMaterialId
                            ? 'border-cozy-peach bg-cozy-blush text-cozy-text shadow-sm'
                            : 'border-cozy-line bg-white text-cozy-muted hover:text-cozy-text'
                        )}
                      >
                        <FileText size={13} />
                        <span className="max-w-[140px] truncate">{m.title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="soft" size="sm" onClick={createNoteMaterial}>
                      <Plus size={14} /> Soạn bài mới
                    </Button>
                    <Button variant="soft" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={14} /> Tải file .txt/.md
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.markdown,text/plain,text/markdown"
                      multiple
                      className="hidden"
                      onChange={handleUploadTxtMd}
                    />
                  </div>
                </div>

                {!currentMaterial ? (
                  <EmptyState
                    title="Chưa có tài liệu nào trong môn này"
                    hint="Bấm [Soạn bài mới] hoặc [Tải file .txt/.md] để đưa nội dung bài học vào nhé!"
                    size="w-36"
                  />
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={currentMaterial.title}
                        onChange={(e) => updateCurrentMaterial({ title: e.target.value })}
                        placeholder="Tiêu đề tài liệu / chương học..."
                        className="font-bold"
                      />
                      <span className="shrink-0 rounded-full bg-cozy-blush px-2.5 py-1 text-[11px] font-semibold text-cozy-muted">
                        {currentMaterial.type === 'file' ? '📄 Tệp tải lên' : '✍️ Ghi chú'} ·{' '}
                        {formatRelativeTime(currentMaterial.updatedAt)}
                      </span>
                      <IconButton
                        title="Xóa tài liệu này"
                        onClick={() => deleteMaterial(currentMaterial.id)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>

                    <textarea
                      value={currentMaterial.content}
                      onChange={(e) => updateCurrentMaterial({ content: e.target.value })}
                      placeholder="Nhập hoặc dán nội dung bài giảng, công thức, từ vựng vào đây...&#10;Mẹo: Viết theo dạng 'Thuật ngữ: Giải nghĩa' trên từng dòng để Gemini tạo Flashcard & Quiz cực chuẩn!"
                      className="cozy-scroll min-h-[260px] flex-1 resize-none rounded-2xl border border-cozy-line bg-cozy-bg p-4 text-sm leading-relaxed text-cozy-text outline-none focus:border-cozy-peach"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cozy-muted">
                      <span>{currentMaterial.content.length} ký tự · Tự động lưu vào localStorage</span>
                      <span className="font-semibold text-cozy-peach">
                        👉 Chọn nút [✨ Tóm tắt] / [🎴 Flashcard] / [📝 Quiz] ở khung Gemini bên phải
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'flashcards' && (
              <div className="cozy-scroll flex-1 overflow-y-auto pr-1">
                <FlashcardDeck
                  flashcards={currentStudySet.flashcards || []}
                  onChange={(nextCards) =>
                    updateStudySet((set) => ({ ...set, flashcards: nextCards }))
                  }
                />
              </div>
            )}

            {activeTab === 'quizzes' && (
              <div className="cozy-scroll flex-1 overflow-y-auto pr-1">
                <QuizArena
                  quizzes={currentStudySet.quizzes || []}
                  onChange={(nextQuizzes) =>
                    updateStudySet((set) => ({ ...set, quizzes: nextQuizzes }))
                  }
                />
              </div>
            )}
          </Card>
        </div>

        {/* CỘT PHẢI (45%): GEMINI WEBVIEW + SMART BRIDGE */}
        <div className="flex w-full flex-col lg:h-full lg:w-[45%]">
          <GeminiBridgePane
            material={currentMaterial}
            onImportStudyData={handleImportFromGemini}
          />
        </div>
      </div>
    </div>
  );
}
