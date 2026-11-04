// Cột phải của StudyHub: Giao diện Trợ lý Gemini & Cầu nối thông minh (Smart Bridge) đồng bộ hệ màu Đa chủ đề
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Wand2,
  ExternalLink,
  RefreshCw,
  Copy,
  FilePlus2,
  Sparkles,
  Layers,
  HelpCircle,
  Settings2,
  MessageSquarePlus,
  Maximize2,
  Minimize2,
  FileText,
  Send,
  KeyRound,
  Bot,
} from 'lucide-react';
import { Card, Button, cx } from '../../components/ui.jsx';
import { attachGeminiWebviewCssInjector } from '../../lib/geminiWebviewStyle.js';
import {
  buildSmartPrompt,
  generateSimulatedResponse,
  parseGeminiStudyPayload,
  splitMaterialChunks,
  MarkdownPreview,
} from './studyHelpers.jsx';

export default function GeminiBridgePane({
  material,
  onImportStudyData,
  onSaveSummaryAsNote,
  isExpanded = false,
  onToggleExpand,
}) {
  const isElectron = Boolean(typeof window !== 'undefined' && window.cozyEnv?.isElectron);
  // Mặc định dùng giao diện Chat CozySpace đồng nhất ('cozy'); vẫn hỗ trợ 'webview' & 'dual' trong ngăn tùy chọn
  const [bridgeMode, setBridgeMode] = useState('cozy');
  const webviewRef = useRef(null);
  const popupRef = useRef(null);
  const chatEndRef = useRef(null);

  const [promptBox, setPromptBox] = useState('');
  const [replyBox, setReplyBox] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);
  const [banner, setBanner] = useState(null);

  const chunks = useMemo(() => splitMaterialChunks(material?.content || ''), [material?.content]);

  useEffect(() => {
    setChunkIdx(0);
  }, [material?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages]);

  const showNotice = (text, tone = 'matcha') => {
    setBanner({ text, tone });
    setTimeout(() => setBanner((b) => (b?.text === text ? null : b)), 4500);
  };

  useEffect(() => {
    if (bridgeMode !== 'webview' || !webviewRef.current) return undefined;
    const el = webviewRef.current;
    const onReady = () => setWebviewReady(true);
    el.addEventListener('dom-ready', onReady);
    const detachCss = attachGeminiWebviewCssInjector(el);
    return () => {
      el.removeEventListener('dom-ready', onReady);
      detachCss();
    };
  }, [bridgeMode]);

  useEffect(() => {
    if (!isElectron || typeof window.cozyEnv?.onGeminiAuthCompleted !== 'function') return undefined;
    return window.cozyEnv.onGeminiAuthCompleted(() => {
      webviewRef.current?.loadURL?.('https://gemini.google.com/app');
      showNotice('Đăng nhập Google thành công! Đã đồng bộ tài khoản vào khung Gemini.');
    });
  }, [isElectron]);

  const openOrFocusDualPopup = async (promptToCopy = promptBox) => {
    const cleanPrompt = String(promptToCopy || '').trim();
    if (cleanPrompt) {
      try {
        await navigator.clipboard.writeText(cleanPrompt);
      } catch {
        /* ignore */
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

  const handleNewGeminiChat = () => {
    if (bridgeMode === 'cozy') {
      setChatMessages([]);
      setReplyBox('');
      showNotice('Đã làm mới phiên trò chuyện Trợ lý Gemini!');
      return;
    }
    if (bridgeMode === 'webview' && webviewRef.current) {
      webviewRef.current.loadURL?.('https://gemini.google.com/app');
      showNotice('Đã mở cuộc trò chuyện Gemini mới!');
    } else {
      openOrFocusDualPopup('');
    }
  };

  const sendPromptToGemini = async (kind) => {
    const prompt = buildSmartPrompt(kind, material, chunkIdx);
    setPromptBox(prompt);

    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      /* ignore */
    }

    if (bridgeMode === 'cozy') {
      const actionLabel =
        kind === 'summary'
          ? `Tóm tắt bài học: "${material?.title || 'Tài liệu hiện tại'}"`
          : kind === 'flashcard'
            ? `Tạo bộ thẻ Flashcard ôn tập từ "${material?.title || 'Tài liệu hiện tại'}"`
            : `Tạo đề trắc nghiệm Quiz từ "${material?.title || 'Tài liệu hiện tại'}"`;
      const simulated = generateSimulatedResponse(kind, material);
      setReplyBox(simulated);
      setChatMessages((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', text: actionLabel },
        { id: `a_${Date.now() + 1}`, role: 'assistant', kind, text: simulated },
      ]);
      showNotice(
        kind === 'summary'
          ? 'Đã tạo bản tóm tắt bài học! Bấm [Lưu trả lời] để lưu thành bài ghi chú.'
          : 'Đã tạo dữ liệu ôn tập! Bấm [Nhập vào Phòng Ôn tập] để đưa sang cột trái.'
      );
      return;
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
          showNotice(
            chunks.length > 1
              ? `Đã gửi Phần ${chunkIdx + 1}/${chunks.length} sang Gemini!`
              : 'Đã gửi câu lệnh vào Gemini!'
          );
          return;
        }
      } catch {
        /* fallback */
      }
      showNotice('Đã sao chép Prompt vào Clipboard! Nhấn Ctrl+V vào ô chat Gemini nhé.');
      return;
    }

    await openOrFocusDualPopup(prompt);
    showNotice('Đã mở cửa sổ đôi Gemini & Copy sẵn câu lệnh (Ctrl + V để gửi)!');
  };

  const handleSendChatInput = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setChatInput('');

    // Nếu người dùng dán trực tiếp JSON Flashcard / Quiz vào ô chat
    if (trimmed.includes('"flashcards"') || trimmed.includes('"quizzes"') || trimmed.startsWith('{')) {
      setReplyBox(trimmed);
      setChatMessages((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', text: 'Đã gửi dữ liệu JSON ôn tập.' },
        {
          id: `a_${Date.now() + 1}`,
          role: 'assistant',
          kind: 'flashcard',
          text: 'Đã nhận khối dữ liệu JSON hợp lệ. Bạn có thể bấm **[Nhập vào Phòng Ôn tập]** trên thanh công cụ để tạo thẻ Flashcard và bài Quiz ngay!',
        },
      ]);
      return;
    }

    const lower = trimmed.toLowerCase();
    let kind = 'summary';
    if (lower.includes('flashcard') || lower.includes('thẻ') || lower.includes('từ vựng')) {
      kind = 'flashcard';
    } else if (lower.includes('quiz') || lower.includes('trắc nghiệm') || lower.includes('câu hỏi')) {
      kind = 'quiz';
    }

    const response =
      kind === 'summary'
        ? `### Giải đáp về "${material?.title || 'Bài học'}"\n\nDựa trên nội dung tài liệu hiện tại:\n\n${generateSimulatedResponse('summary', material).replace(/^## .*?\n\n/, '')}`
        : generateSimulatedResponse(kind, material);

    setReplyBox(response);
    setChatMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: 'user', text: trimmed },
      { id: `a_${Date.now() + 1}`, role: 'assistant', kind, text: response },
    ]);
  };

  const extractLatestGeminiReply = async (preferJson = false) => {
    let source = replyBox.trim();

    if (!source && chatMessages.length > 0) {
      for (let i = chatMessages.length - 1; i >= 0; i -= 1) {
        const msg = chatMessages[i];
        if (msg.role === 'assistant' && msg.text) {
          if (!preferJson || msg.text.includes('{') || msg.text.includes(':')) {
            source = msg.text.trim();
            break;
          }
        }
      }
    }

    if (
      !source &&
      bridgeMode === 'webview' &&
      webviewRef.current &&
      typeof webviewRef.current.executeJavaScript === 'function'
    ) {
      try {
        const extracted = await webviewRef.current.executeJavaScript(`
          (function() {
            const preferJson = ${preferJson ? 'true' : 'false'};
            if (preferJson) {
              const codes = document.querySelectorAll('code, message-content, .model-response-text');
              for (let i = codes.length - 1; i >= 0; i--) {
                const txt = (codes[i].innerText || '').trim();
                if (txt.includes('"flashcards"') || txt.includes('"quizzes"') || txt.startsWith('{')) {
                  return txt;
                }
              }
            }
            const responses = document.querySelectorAll('message-content, .model-response-text');
            if (responses.length) {
              return (responses[responses.length - 1].innerText || '').trim();
            }
            return '';
          })();
        `);
        if (extracted && String(extracted).trim()) {
          source = String(extracted).trim();
        }
      } catch {
        /* fallback */
      }
    }

    if (!source) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim()) source = clip.trim();
      } catch {
        /* ignore */
      }
    }
    return source;
  };

  const handleImportReply = async () => {
    const source = await extractLatestGeminiReply(true);
    if (source && !replyBox.trim()) setReplyBox(source);

    const result = parseGeminiStudyPayload(source);
    if (result.error) {
      showNotice(result.error, 'peach');
      return;
    }

    onImportStudyData(result);
    setReplyBox('');
  };

  const handleSaveAsMaterial = async () => {
    const source = await extractLatestGeminiReply(false);
    if (!source) {
      showNotice('Chưa tìm thấy nội dung trả lời từ Gemini hoặc Clipboard để lưu thành ghi chú.', 'peach');
      return;
    }
    onSaveSummaryAsNote?.(source);
    setReplyBox('');
    showNotice('Đã lưu câu trả lời thành một Bài ghi chú mới trong môn học!');
  };

  const hasMaterialContent = Boolean(material?.content?.trim());

  return (
    <Card className="flex h-full flex-col overflow-hidden p-4">
      {/* ================================================================ */}
      {/* TẦNG 1: HEADER TINH GỌN + TRẠNG THÁI BÀI ĐANG KẾT NỐI            */}
      {/* ================================================================ */}
      <div className="mb-2.5 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)',
              color: 'var(--accent)',
            }}
          >
            <Sparkles size={15} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="whitespace-nowrap text-sm font-bold text-cozy-text">Trợ lý Gemini</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                Sẵn sàng
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <FileText size={11} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
              <span className="break-words">
                {material
                  ? hasMaterialContent
                    ? `Bài: ${material.title}`
                    : `${material.title} (chưa có chữ)`
                  : 'Chưa chọn tài liệu'}
              </span>
            </div>
          </div>

          {chunks.length > 1 && (
            <select
              value={chunkIdx}
              onChange={(e) => setChunkIdx(Number(e.target.value))}
              title="Tài liệu dài hơn 8.000 ký tự — chọn từng phần để gửi sang Gemini không bị cắt bớt"
              style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
              className="rounded-xl px-2 py-0.5 text-[11px] font-semibold text-cozy-text outline-none"
            >
              {chunks.map((_, idx) => (
                <option key={idx} value={idx}>
                  Phần {idx + 1}/{chunks.length}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Cụm nút tiện ích khung Gemini */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Làm mới cuộc trò chuyện"
            onClick={handleNewGeminiChat}
            className="flex h-7 w-7 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-black/5 hover:text-cozy-text"
          >
            <MessageSquarePlus size={14} strokeWidth={1.75} />
          </button>

          {bridgeMode === 'webview' && (
            <button
              type="button"
              title="Tải lại khung Gemini"
              onClick={() => webviewRef.current?.reload?.()}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-black/5 hover:text-cozy-text"
            >
              <RefreshCw size={13} strokeWidth={1.75} />
            </button>
          )}

          {onToggleExpand && (
            <button
              type="button"
              title={isExpanded ? 'Thu về bố cục chuẩn (45%)' : 'Mở rộng khung Gemini rộng rãi hơn'}
              onClick={onToggleExpand}
              className={cx(
                'hidden h-7 w-7 items-center justify-center rounded-xl transition lg:flex',
                isExpanded
                  ? 'bg-black/5 text-cozy-text'
                  : 'text-[var(--text-muted)] hover:bg-black/5 hover:text-cozy-text'
              )}
            >
              {isExpanded ? <Minimize2 size={13} strokeWidth={1.75} /> : <Maximize2 size={13} strokeWidth={1.75} />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowToolsDrawer((v) => !v)}
            title="Tùy chọn nâng cao (Chế độ kết nối, Đăng nhập Google, Cửa sổ đôi, Dán JSON thủ công)"
            className={cx(
              'flex h-7 w-7 items-center justify-center rounded-xl transition',
              showToolsDrawer
                ? 'bg-black/10 text-cozy-text'
                : 'text-[var(--text-muted)] hover:bg-black/5 hover:text-cozy-text'
            )}
          >
            <Settings2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* TẦNG 2: CỤM NÚT CÔNG CỤ FLEX-WRAP (KHÔNG BỊ CẮT CHỮ "...")       */}
      {/* ================================================================ */}
      <div
        className="mb-3 flex shrink-0 flex-wrap items-center gap-1.5 pb-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={() => sendPromptToGemini('summary')}
          title="Tóm tắt nội dung bài học đang chọn bằng Gemini"
          style={{ border: '1px solid var(--border-subtle)' }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-transparent px-2.5 py-1.5 text-xs font-semibold text-cozy-text transition hover:bg-black/5 active:scale-[0.98]"
        >
          <Sparkles size={13} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
          <span>Tóm tắt bài</span>
        </button>

        <button
          type="button"
          onClick={() => sendPromptToGemini('flashcard')}
          title="Yêu cầu Gemini tạo bộ thẻ Flashcard JSON từ bài học"
          style={{ border: '1px solid var(--border-subtle)' }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-transparent px-2.5 py-1.5 text-xs font-semibold text-cozy-text transition hover:bg-black/5 active:scale-[0.98]"
        >
          <Layers size={13} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
          <span>Tạo Flashcard</span>
        </button>

        <button
          type="button"
          onClick={() => sendPromptToGemini('quiz')}
          title="Yêu cầu Gemini tạo đề trắc nghiệm Quiz JSON từ bài học"
          style={{ border: '1px solid var(--border-subtle)' }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-transparent px-2.5 py-1.5 text-xs font-semibold text-cozy-text transition hover:bg-black/5 active:scale-[0.98]"
        >
          <HelpCircle size={13} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
          <span>Tạo câu hỏi Quiz</span>
        </button>

        <button
          type="button"
          onClick={handleSaveAsMaterial}
          title="Lưu câu trả lời văn bản mới nhất của Gemini thành 1 Bài ghi chú trong môn này"
          style={{ border: '1px solid var(--border-subtle)' }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-transparent px-2.5 py-1.5 text-xs font-semibold text-cozy-text transition hover:bg-black/5 active:scale-[0.98]"
        >
          <FilePlus2 size={13} strokeWidth={1.75} className="shrink-0 text-cozy-accent" />
          <span>Lưu trả lời</span>
        </button>

        <button
          type="button"
          onClick={handleImportReply}
          title="Đọc JSON từ câu trả lời của Gemini để tạo thẻ Flashcard 3D & bài Quiz bên trái"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#2A2120',
          }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition hover:brightness-105 active:scale-[0.98]"
        >
          <Wand2 size={13} strokeWidth={1.75} className="shrink-0" />
          <span>Nhập vào Phòng Ôn tập</span>
        </button>
      </div>

      {/* Ngăn kéo tùy chọn nâng cao */}
      {showToolsDrawer && (
        <div
          className="mb-3 shrink-0 space-y-2.5 pb-3 text-xs animate-pop-in"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {isElectron && (
                <Button
                  variant="soft"
                  size="sm"
                  className="px-2.5 py-1 text-[11px]"
                  onClick={async () => {
                    showNotice('Đang mở trình duyệt để đăng nhập Google an toàn...');
                    const res = await window.cozyEnv?.openGeminiSignIn?.();
                    if (res?.ok) {
                      webviewRef.current?.loadURL?.('https://gemini.google.com/app');
                    }
                  }}
                >
                  <KeyRound size={12} /> Đăng nhập Google
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

            <div
              className="flex items-center gap-1 rounded-xl p-0.5"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              {[
                { id: 'cozy', label: 'Chat CozySpace' },
                { id: 'webview', label: 'Nhúng Webview' },
                { id: 'dual', label: 'Cửa sổ đôi' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setBridgeMode(m.id)}
                  className={cx(
                    'whitespace-nowrap rounded-lg px-2 py-0.5 text-[10px] font-bold transition',
                    bridgeMode === m.id
                      ? 'bg-cozy-peach text-[#2A2120]'
                      : 'text-[var(--text-muted)] hover:text-cozy-text'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
              <span>Dán câu trả lời JSON / Tóm tắt thủ công (tùy chọn):</span>
              {replyBox && (
                <button
                  type="button"
                  onClick={() => setReplyBox('')}
                  className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-cozy-accent"
                >
                  Xóa ô
                </button>
              )}
            </div>
            <textarea
              rows={2}
              spellCheck={false}
              value={replyBox}
              onChange={(e) => setReplyBox(e.target.value)}
              placeholder="Để trống để tự động đọc câu trả lời mới nhất, hoặc dán JSON vào đây..."
              style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-app)' }}
              className="cozy-scroll w-full resize-none rounded-xl p-2 font-mono text-xs text-cozy-text outline-none"
            />
          </div>
        </div>
      )}

      {banner && (
        <div
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
          className="mb-2.5 shrink-0 pb-2 text-[11px] font-semibold text-cozy-text animate-pop-in"
        >
          {banner.text}
        </div>
      )}

      {/* ================================================================ */}
      {/* KHUNG CHAT ĐỒNG NHẤT THEO --bg-card & --accent CỦA CHỦ ĐỀ        */}
      {/* ================================================================ */}
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {bridgeMode === 'cozy' ? (
          <div className="flex h-full min-h-0 flex-1 flex-col justify-between">
            {/* Danh sách tin nhắn */}
            <div className="cozy-scroll flex-1 space-y-3 overflow-y-auto p-4">
              {/* Lời chào mặc định đồng bộ CozySpace */}
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  <Bot size={15} strokeWidth={1.75} />
                </span>
                <div
                  className="flex-1 rounded-2xl p-3.5 text-xs leading-relaxed text-cozy-text"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <p className="font-bold text-cozy-text">
                    Xin chào! Mình là Trợ lý Học tập Gemini của CozySpace.
                  </p>
                  <p className="mt-1 text-[var(--text-muted)]">
                    {material
                      ? `Đang kết nối với tài liệu "${material.title}". Bạn hãy bấm các nút công cụ phía trên để Tóm tắt bài, Tạo Flashcard hoặc Tạo câu hỏi Quiz ngay lập tức, hoặc đặt câu hỏi ở ô bên dưới nhé.`
                      : 'Hãy chọn hoặc soạn một tài liệu ở cột bên trái để mình hỗ trợ tóm tắt và tạo bộ câu hỏi ôn tập nhé.'}
                  </p>
                </div>
              </div>

              {chatMessages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div
                      className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-xs font-semibold leading-relaxed"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent) 22%, var(--bg-card))',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                        color: 'var(--accent)',
                      }}
                    >
                      <Sparkles size={14} strokeWidth={1.75} />
                    </span>
                    <div
                      className="min-w-0 flex-1 rounded-2xl p-3.5 text-xs leading-relaxed text-cozy-text"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <MarkdownPreview content={msg.text} />
                      <div
                        className="mt-2.5 flex flex-wrap items-center gap-2 pt-2"
                        style={{ borderTop: '1px solid var(--border-subtle)' }}
                      >
                        {msg.kind === 'summary' ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSaveSummaryAsNote?.(msg.text);
                              showNotice('Đã lưu bản tóm tắt thành Bài ghi chú mới!');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-cozy-accent hover:underline"
                          >
                            <FilePlus2 size={12} strokeWidth={1.75} /> Lưu thành Bài ghi chú
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const parsed = parseGeminiStudyPayload(msg.text);
                              if (!parsed.error) onImportStudyData(parsed);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-cozy-accent hover:underline"
                          >
                            <Wand2 size={12} strokeWidth={1.75} /> Nhập ngay vào Phòng Ôn tập
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(msg.text);
                            showNotice('Đã sao chép nội dung trả lời!');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-cozy-text"
                        >
                          <Copy size={11} strokeWidth={1.75} /> Sao chép
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Ô nhập tin nhắn đồng bộ --bg-card & nút gửi --accent */}
            <div
              className="p-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-1.5"
                style={{
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <input
                  type="text"
                  spellCheck={false}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatInput();
                    }
                  }}
                  placeholder="Hỏi Trợ lý Gemini về bài học hoặc dán JSON ôn tập..."
                  className="w-full bg-transparent py-1 text-xs text-cozy-text outline-none placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="button"
                  onClick={handleSendChatInput}
                  disabled={!chatInput.trim()}
                  title="Gửi tin nhắn"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#2A2120',
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition hover:brightness-105 disabled:opacity-40"
                >
                  <Send size={13} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>
        ) : bridgeMode === 'webview' ? (
          <div className="relative flex h-full w-full flex-1 flex-col">
            {isElectron && !webviewReady && (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[var(--text-muted)]"
                style={{ backgroundColor: 'var(--bg-app)' }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <Sparkles size={18} className="animate-pulse text-cozy-accent" />
                </div>
                <span>Đang chuẩn bị góc trò chuyện Gemini...</span>
              </div>
            )}

            <webview
              ref={webviewRef}
              id="gemini-webview"
              src="https://gemini.google.com/app"
              partition="persist:gemini"
              className="h-full w-full flex-1"
              style={{
                width: '100%',
                height: '100%',
                flex: '1 1 0%',
                backgroundColor: 'var(--bg-app)',
              }}
              allowpopups="true"
            />

            {!isElectron && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center"
                style={{ backgroundColor: 'var(--bg-app)' }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Sparkles size={22} className="text-cozy-accent" />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="text-sm font-bold text-cozy-text">
                    Khung Gemini nhúng trực tiếp dành cho bản Desktop
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                    Bạn có thể dùng ngay chế độ Chat CozySpace hoặc mở Cửa sổ đôi Gemini.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="sm" variant="soft" onClick={() => setBridgeMode('cozy')}>
                    Dùng Chat CozySpace
                  </Button>
                  <Button size="sm" onClick={() => openOrFocusDualPopup(promptBox)}>
                    <ExternalLink size={13} /> Mở Gemini
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="cozy-scroll flex h-full flex-1 flex-col justify-between gap-3 overflow-y-auto p-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-cozy-text">
                  Chế độ Cửa sổ đôi Gemini
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyBox(generateSimulatedResponse('summary', material));
                      setShowToolsDrawer(true);
                      showNotice('Đã tạo bản tóm tắt mẫu từ tài liệu!');
                    }}
                    className="text-[11px] font-bold text-cozy-accent hover:underline"
                  >
                    Tóm tắt mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyBox(generateSimulatedResponse('flashcard', material));
                      setShowToolsDrawer(true);
                      showNotice('Đã tạo nhanh bộ JSON mẫu từ tài liệu!');
                    }}
                    className="text-[11px] font-bold text-cozy-accent hover:underline"
                  >
                    JSON mẫu
                  </button>
                </div>
              </div>

              <ol className="list-inside list-decimal space-y-1.5 text-xs leading-relaxed text-cozy-text">
                <li>
                  Bấm <b>[Tóm tắt bài]</b>, <b>[Tạo Flashcard]</b>, hoặc <b>[Tạo câu hỏi Quiz]</b> ở thanh trên.
                </li>
                <li>
                  Ứng dụng mở cửa sổ Gemini và <b>Copy sẵn câu lệnh vào Clipboard</b>.
                </li>
                <li>
                  Nhấn <kbd className="rounded px-1.5 py-0.5 font-mono" style={{ border: '1px solid var(--border-subtle)' }}>Ctrl + V</kbd> trong Gemini để gửi, sau đó bấm <b>[Nhập vào Phòng Ôn tập]</b> hoặc <b>[Lưu trả lời]</b>!
                </li>
              </ol>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                  <span>Câu lệnh Prompt hiện tại:</span>
                  {promptBox && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(promptBox);
                        showNotice('Đã sao chép lại Prompt vào Clipboard!');
                      }}
                      className="inline-flex items-center gap-1 text-cozy-accent hover:underline"
                    >
                      <Copy size={12} /> Copy lại
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  spellCheck={false}
                  value={promptBox}
                  onChange={(e) => setPromptBox(e.target.value)}
                  placeholder="Bấm 1 trong 3 nút [Tóm tắt bài] / [Tạo Flashcard] / [Tạo câu hỏi Quiz] ở trên, hoặc tự gõ câu hỏi cho Gemini..."
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  className="cozy-scroll w-full resize-none rounded-2xl p-2.5 text-xs leading-relaxed text-cozy-text outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
