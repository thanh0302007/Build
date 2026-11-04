// Tiện ích xử lý Tài liệu, Markdown, Chia đoạn >8.000 ký tự & Phân tích JSON Gemini cho StudyHub
import React from 'react';

export const SUBJECT_COLORS = [
  { id: 'peach', label: 'Hồng đào', bg: '#F4ACB7', soft: '#FFF9F9' },
  { id: 'matcha', label: 'Matcha', bg: '#A3C9A8', soft: '#EEF6EF' },
  { id: 'lavender', label: 'Oải hương', bg: '#E2D4F0', soft: '#F6F1FB' },
  { id: 'butter', label: 'Vàng bơ', bg: '#FFF3B0', soft: '#FFFDF0' },
];

export const CHUNK_SIZE = 8000;

/** Chia tài liệu dài thành các phần ~8.000 ký tự theo ranh giới dòng để không cắt ngang câu */
export function splitMaterialChunks(rawText = '') {
  const text = String(rawText || '').trim();
  if (!text) return [''];
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + CHUNK_SIZE);
    if (end < text.length) {
      const newlineBreak = text.lastIndexOf('\n', end);
      if (newlineBreak > cursor + CHUNK_SIZE * 0.6) {
        end = newlineBreak;
      }
    }
    chunks.push(text.slice(cursor, end).trim());
    cursor = end;
  }
  return chunks.filter(Boolean);
}

/** Xây dựng câu lệnh Prompt cho 3 nút Smart Bridge (hỗ trợ chọn Phần đối với tài liệu dài) */
export function buildSmartPrompt(kind, material, chunkIndex = 0) {
  const title = material?.title || 'Bài học';
  const chunks = splitMaterialChunks(material?.content || '');
  const safeIdx = Math.min(Math.max(0, chunkIndex), chunks.length - 1);
  const partLabel = chunks.length > 1 ? ` (Phần ${safeIdx + 1}/${chunks.length})` : '';
  const excerpt = chunks[safeIdx]
    ? chunks[safeIdx]
    : `Chủ đề: "${title}". (Tài liệu hiện đang trống, hãy tạo nội dung mẫu sát với chủ đề này).`;

  if (kind === 'summary') {
    return `Hãy tóm tắt mạch lạc, có cấu trúc rõ ràng (ý chính, khái niệm/công thức quan trọng, từ khóa cần nhớ) cho bài học "${title}${partLabel}" dưới đây bằng tiếng Việt dễ hiểu:\n\n---\n${excerpt}`;
  }

  if (kind === 'flashcard') {
    return `Dựa trên tài liệu "${title}${partLabel}" bên dưới, hãy tạo từ 6 đến 10 thẻ Flashcard ôn tập trọng tâm.
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

  return `Dựa trên tài liệu "${title}${partLabel}" bên dưới, hãy tạo từ 5 đến 8 câu hỏi trắc nghiệm (4 lựa chọn A/B/C/D) để kiểm tra mức độ hiểu bài.
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

/** Tạo dữ liệu phản hồi mẫu thông minh dựa trên nội dung tài liệu (cho chế độ Offline / Preview) */
export function generateSimulatedResponse(kind, material) {
  const title = material?.title || 'Bài học';
  const text = (material?.content || '').trim();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•#\d.)\s]+/, '').trim())
    .filter((l) => l.length > 6);

  if (kind === 'summary') {
    const bullets = (
      lines.length
        ? lines.slice(0, 6)
        : [
            `Khái niệm cốt lõi và định nghĩa quan trọng của ${title}.`,
            `Các đặc điểm, tính chất và phân loại chính cần lưu ý.`,
            `Ứng dụng thực tế và dạng bài tập thường gặp trong ${title}.`,
          ]
    )
      .map((l) => `- ${l.slice(0, 160)}`)
      .join('\n');
    return `## ✨ Tóm tắt bài học: ${title}\n\n${bullets}\n\n> 💡 **Mẹo ôn tập:** Bấm **[🎴 Flashcard]** hoặc **[📝 Quiz]** rồi nhấn **[🪄 Nhập vào Ôn tập]** để luyện ngay ở cột bên trái!`;
  }

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
              {
                front: `Từ khóa quan trọng nhất trong ${title}`,
                back: `Ghi nhớ định nghĩa, công thức và ví dụ minh họa của ${title}.`,
              },
              {
                front: `Khi ôn tập ${title} cần lưu ý điều gì?`,
                back: `Nắm chắc bản chất, phân biệt các trường hợp dễ nhầm lẫn và làm bài Quiz kiểm tra.`,
              },
            ];
    return '```json\n' + JSON.stringify({ flashcards: cards }, null, 2) + '\n```';
  }

  const baseItems =
    pairs.length >= 1
      ? pairs.slice(0, 5)
      : lines.slice(0, 4).map((l, i) => ({ front: `Nội dung trọng tâm #${i + 1} trong "${title}"`, back: l }));

  const quizzes = (
    baseItems.length
      ? baseItems
      : [
          { front: `Đâu là mô tả đúng nhất về "${title}"?`, back: `Là nội dung cốt lõi cần nắm vững trong bài ${title}.` },
          {
            front: `Phương pháp hiệu quả để ghi nhớ "${title}" là gì?`,
            back: `Kết hợp đọc tài liệu, lật thẻ Flashcard 3D và làm trắc nghiệm Quiz.`,
          },
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
      question: item.front.endsWith('?') ? item.front : `Phát biểu nào sau đây đúng về "${item.front}"?`,
      options,
      correctIndex,
      explanation: `Theo tài liệu "${title}": ${item.back}`,
    };
  });

  return '```json\n' + JSON.stringify({ quizzes }, null, 2) + '\n```';
}

/** Bộ phân tích câu trả lời của Gemini sang Flashcard / Quiz */
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
    const rawOpts = Array.isArray(q.options ?? q.choices ?? q.answers)
      ? q.options ?? q.choices ?? q.answers
      : [];
    const options = rawOpts
      .map((o) => String(o).replace(/^[A-D][.)]\s*/i, '').trim())
      .filter(Boolean);
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
    const qzSource = Array.isArray(data.quizzes)
      ? data.quizzes
      : Array.isArray(data.questions)
        ? data.questions
        : list;
    flashcards = fcSource.map(normalizeFlashcard).filter(Boolean);
    quizzes = qzSource.map(normalizeQuiz).filter(Boolean);
  }

  if (flashcards.length === 0 && quizzes.length === 0) {
    const lines = cleaned
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
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
      error:
        'Không tìm thấy dữ liệu Flashcard hoặc Quiz hợp lệ. Hãy bấm [🎴 Flashcard] hoặc [📝 Quiz] để Gemini trả lời đúng chuẩn JSON nhé!',
    };
  }
  return { flashcards, quizzes, error: null };
}

/** Gộp và loại bỏ thẻ Flashcard / câu hỏi Quiz bị trùng lặp khi bấm Nhập nhiều lần */
export function dedupeMergeStudyData(existingCards = [], incomingCards = [], existingQuizzes = [], incomingQuizzes = []) {
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const seenCards = new Set(existingCards.map((c) => norm(c.front)));
  const addedCards = [];
  let skipped = 0;

  incomingCards.forEach((c) => {
    const k = norm(c.front);
    if (!k || seenCards.has(k)) {
      skipped += 1;
      return;
    }
    seenCards.add(k);
    addedCards.push(c);
  });

  const seenQuizzes = new Set(existingQuizzes.map((q) => norm(q.question)));
  const addedQuizzes = [];

  incomingQuizzes.forEach((q) => {
    const k = norm(q.question);
    if (!k || seenQuizzes.has(k)) {
      skipped += 1;
      return;
    }
    seenQuizzes.add(k);
    addedQuizzes.push(q);
  });

  return {
    flashcards: [...existingCards, ...addedCards],
    quizzes: [...existingQuizzes, ...addedQuizzes],
    addedCardsCount: addedCards.length,
    addedQuizzesCount: addedQuizzes.length,
    skippedCount: skipped,
  };
}

// ============================================================
// BỘ HIỂN THỊ MARKDOWN AN TOÀN (JSX THUẦN, KHÔNG DÙNG innerHTML)
// ============================================================
function renderInline(text) {
  if (!text) return null;
  const tokens = String(text).split(
    /(`[^`]+`|\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|__[\s\S]+?__|==[\s\S]+?==|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\(https?:\/\/[^)]+\))/g
  );
  return tokens.map((tok, idx) => {
    if (!tok) return null;
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return <code key={idx}>{tok.slice(1, -1)}</code>;
    }
    if (tok.startsWith('***') && tok.endsWith('***') && tok.length > 6) {
      return (
        <strong key={idx}>
          <em>{tok.slice(3, -3)}</em>
        </strong>
      );
    }
    if (
      ((tok.startsWith('**') && tok.endsWith('**')) ||
        (tok.startsWith('__') && tok.endsWith('__'))) &&
      tok.length > 4
    ) {
      return <strong key={idx}>{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith('==') && tok.endsWith('==') && tok.length > 4) {
      return <mark key={idx}>{tok.slice(2, -2)}</mark>;
    }
    if (
      ((tok.startsWith('*') && tok.endsWith('*')) ||
        (tok.startsWith('_') && tok.endsWith('_'))) &&
      tok.length > 2
    ) {
      return <em key={idx}>{tok.slice(1, -1)}</em>;
    }
    const linkMatch = tok.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-cozy-accent underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <React.Fragment key={idx}>{tok}</React.Fragment>;
  });
}

export function MarkdownPreview({ content }) {
  const raw = String(content || '').trim();
  if (!raw) {
    return (
      <p className="italic text-[var(--text-muted)]">
        Tài liệu đang trống — hãy chuyển sang chế độ Soạn thảo để nhập nội dung bài học nhé!
      </p>
    );
  }

  const lines = raw.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block ```
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      blocks.push(
        <pre key={`code-${i}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^(?:---+|\*\*\*+|___+)$/.test(line.trim())) {
      blocks.push(<hr key={`hr-${i}`} />);
      i += 1;
      continue;
    }

    const hMatch = line.match(/^\s*(#{1,6})\s*(.+)$/);
    if (hMatch) {
      const level = Math.min(4, hMatch[1].length);
      const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
      const cleanHeading = hMatch[2].replace(/\s*#+\s*$/, '').trim();
      blocks.push(<Tag key={`h-${i}`}>{renderInline(cleanHeading)}</Tag>);
      i += 1;
      continue;
    }

    if (line.trim().startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote key={`q-${i}`}>
          {quoteLines.map((ql, qi) => (
            <p key={qi}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*•+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*•+]\s+/.test(lines[i])) {
        const cleaned = lines[i].replace(/^\s*[-*•+]\s+/, '');
        const checkMatch = cleaned.match(/^\[([ xX✓])\]\s+(.*)$/);
        if (checkMatch) {
          const checked = checkMatch[1].trim() !== '';
          items.push(
            <li key={i} className="list-none -ml-4 flex items-start gap-2.5">
              <span
                className="mt-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold"
                style={{
                  borderColor: checked ? 'var(--accent)' : 'var(--border-subtle)',
                  backgroundColor: checked ? 'var(--accent)' : 'transparent',
                  color: '#FFFFFF',
                }}
              >
                {checked ? '✓' : ''}
              </span>
              <span className={checked ? 'line-through opacity-75' : ''}>
                {renderInline(checkMatch[2])}
              </span>
            </li>
          );
        } else {
          items.push(<li key={i}>{renderInline(cleaned)}</li>);
        }
        i += 1;
      }
      blocks.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>);
        i += 1;
      }
      blocks.push(<ol key={`ol-${i}`}>{items}</ol>);
      continue;
    }

    // Paragraph
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !/^\s*#{1,6}\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*•+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^(?:---+|\*\*\*+|___+)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={`p-${i}`}>
        {paraLines.map((pl, pi) => (
          <React.Fragment key={pi}>
            {pi > 0 && <br />}
            {renderInline(pl)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className="cozy-markdown">{blocks}</div>;
}

