// ============================================================
// SCRIPT TIÊM CSS & CẦU NỐI CHO <webview id="gemini-webview">
// Theo đúng PROJECT_RULES.md mục I.1 và mục IV.1:
//   - Ẩn Sidebar (mat-sidenav), nút mở menu 3 gạch, banner hạn mức & phần thừa,
//     nhường tối đa diện tích cho phần câu trả lời của Gemini
//   - Đổi background-color sang #FDFBF7 (ép chế độ Light Theme trên body)
//   - Đổi font văn bản sang 'Quicksand', 'Nunito', sans-serif
//     (GIỮ NGUYÊN font của Material Icons / Google Symbols / Lumi Symbols)
//   - Bo tròn khung nhập chat chính (input-area-v2) gọn gàng với viền #F4ACB7
// ============================================================

export const GEMINI_PASTEL_CSS = `
  /* 1. Ép chế độ sáng (Light mode) và nền Kem ấm #FDFBF7 */
  :root,
  html,
  body {
    color-scheme: light !important;
    height: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background-color: #FDFBF7 !important;
    background: #FDFBF7 !important;
    color: #4A4A4A !important;
    font-family: 'Quicksand', 'Nunito', 'Segoe UI', sans-serif !important;
  }

  /* 2. Ẩn Sidebar, nút mở menu 3 gạch, hiệu ứng nền tối, thanh chuyển chế độ phụ (chat-spark-toggle)
        và các banner thông báo hạn mức ("Hạn mức của bạn sẽ được đặt lại...") để không che câu trả lời!
        LƯU Ý: KHÔNG ẩn side-navigation-v2 vì thẻ này bọc toàn bộ khung chat. */
  mat-sidenav,
  .mat-drawer-backdrop,
  side-navigation-content,
  bard-sidenav,
  chat-app-side-nav-menu-button > side-nav-menu-button,
  .menu-button-container,
  chat-loading-animation,
  .lm-glow,
  .blur-bg,
  .autosuggest-scrim,
  chat-app-banners,
  chat-app-announcement-banners,
  .announcement-banner-container,
  chat-spark-toggle,
  .hallucination-disclaimer,
  condensed-tos-disclaimer,
  footer,
  input-area-v2 > :not(.input-area),
  input-area-v2 .input-area > :not(fieldset):not(auto-suggest),
  fieldset.input-area-fieldset > :not(.text-input-field) {
    display: none !important;
  }

  /* 3. Đồng bộ màu nền Kem ấm #FDFBF7 cho toàn bộ khung chứa hội thoại */
  chat-app-orchestrator,
  chat-app,
  main,
  bard-sidenav-container,
  bard-sidenav-content,
  chat-window,
  .chat-container,
  .conversation-container,
  .chat-history-scroll-container,
  infinite-scroller,
  mat-sidenav-container,
  mat-sidenav-content,
  .mat-drawer-container,
  .mat-drawer-content {
    background-color: #FDFBF7 !important;
    background: #FDFBF7 !important;
    color: #4A4A4A !important;
  }

  /* Đảm bảo thanh chọn Model (Gemini Flash / Pro / Argon) hiển thị gọn ở góc trên trái */
  bard-mode-switcher,
  .bard-mode-switcher,
  model-selector {
    display: inline-flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    color: #4A4A4A !important;
  }

  /* Thu gọn chiều cao thanh Header trên cùng của Gemini để tăng diện tích đọc câu trả lời */
  main.chat-app {
    margin-top: 42px !important;
    height: calc(100% - 42px) !important;
  }

  /* Mở rộng phần nội dung chat ra toàn khung sau khi ẩn Sidebar */
  mat-sidenav-content,
  .mat-drawer-content,
  bard-sidenav-container,
  bard-sidenav-content,
  .chat-history-scroll-container,
  .conversation-container {
    margin-left: 0 !important;
    padding-left: 0 !important;
    max-width: 100% !important;
  }

  /* 4. Thu gọn màn hình chào ban đầu */
  .zero-state-container,
  .modular-zero-state-container,
  .top-section-container,
  .greeting-container,
  modular-zero-state,
  zero-state {
    --top-section-container-height: auto !important;
    padding-top: 2px !important;
    padding-bottom: 2px !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    min-height: 0 !important;
  }

  .static-sparkle-container img.lm-static-sparkle {
    width: 24px !important;
    height: 24px !important;
  }

  modular-zero-state h1.gds-display-s,
  modular-zero-state .message-text {
    font-size: 16px !important;
    line-height: 1.3 !important;
    color: #4A4A4A !important;
  }

  /* 5. Đổi font cho các thẻ văn bản, GIỮ NGUYÊN 100% font của các thẻ icon */
  p,
  li,
  h1,
  h2,
  h3,
  h4,
  textarea,
  input,
  .markdown,
  .model-response-text,
  .query-text,
  message-content,
  rich-textarea,
  .ql-editor,
  .gds-body-m,
  .gds-body-l,
  .gds-title-m,
  .message-text {
    font-family: 'Quicksand', 'Nunito', 'Segoe UI', sans-serif !important;
  }

  /* 6. Nút Sign in trên thanh đầu trang (khi chưa đăng nhập) */
  a[href*="accounts.google.com"],
  a[aria-label*="Sign in" i],
  a[aria-label*="Đăng nhập" i],
  button[aria-label*="Sign in" i],
  button[aria-label*="Đăng nhập" i] {
    background-color: #F4ACB7 !important;
    color: #FFFFFF !important;
    border-radius: 9999px !important;
    font-weight: 700 !important;
    border: none !important;
  }
  a[href*="accounts.google.com"] *,
  a[aria-label*="Sign in" i] *,
  button[aria-label*="Sign in" i] * {
    color: #FFFFFF !important;
  }

  /* 7. Thẻ bong bóng hội thoại của người dùng & Gemini theo bảng màu Cozy Pastel */
  user-query,
  .user-query-bubble-with-background,
  .query-content {
    background-color: #FFF9F9 !important;
    border: 1px solid #F4ACB7 !important;
    border-radius: 18px !important;
    color: #4A4A4A !important;
  }

  model-response,
  .response-container,
  .model-response-container {
    background-color: #FFFFFF !important;
    border: 1px solid #F0EAE1 !important;
    border-radius: 20px !important;
    padding: 10px 14px !important;
    color: #4A4A4A !important;
    box-shadow: 0 2px 8px rgba(244, 172, 183, 0.1) !important;
  }

  /* Khối code JSON hiển thị dịu mắt */
  pre,
  code,
  .code-block {
    background-color: #FFF9F9 !important;
    border: 1px solid #F0EAE1 !important;
    border-radius: 14px !important;
    color: #4A4A4A !important;
  }

  /* 8. Thu gọn tối đa chiều cao vùng nhập chat ở đáy để không lấp câu trả lời */
  input-container,
  .input-gradient-overlay,
  .input-area-container,
  .input-area,
  fieldset.input-area-fieldset,
  .text-input-field,
  rich-textarea {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  input-container,
  .input-area-container {
    padding-top: 2px !important;
    padding-bottom: 4px !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    min-height: 0 !important;
  }

  /* Bo tròn duy nhất khung nhập chat chính (input-area-v2) gọn nhẹ với viền Hồng đào #F4ACB7 */
  input-area-v2 {
    background-color: #FFFFFF !important;
    border: 2px solid #F4ACB7 !important;
    border-radius: 22px !important;
    color: #4A4A4A !important;
    box-shadow: 0 2px 10px rgba(244, 172, 183, 0.18) !important;
    margin: 0 8px 4px 8px !important;
    padding: 2px 6px !important;
    min-height: 0 !important;
  }

  .text-input-field {
    min-height: 40px !important;
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }

  .ql-editor,
  .ql-editor::before {
    color: #4A4A4A !important;
  }

  /* Nút gửi câu hỏi tông Hồng đào */
  button.send-button,
  .send-button-container button,
  button[aria-label*="Send" i],
  button[aria-label*="Gửi" i] {
    background-color: #F4ACB7 !important;
    color: #FFFFFF !important;
    border-radius: 9999px !important;
  }
  button.send-button *,
  .send-button-container button * {
    color: #FFFFFF !important;
  }

  /* Thanh cuộn mảnh màu Pastel */
  ::-webkit-scrollbar {
    width: 6px !important;
    height: 6px !important;
  }
  ::-webkit-scrollbar-thumb {
    background: #F4ACB7 !important;
    border-radius: 9999px !important;
  }
`;

/** Script ép Gemini chuyển từ dark-theme sang light-theme và ẩn các thông báo hạn mức động */
export const GEMINI_LIGHT_THEME_SCRIPT = `
  (function() {
    try {
      if (document.body) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      }
      localStorage.setItem('Bard-Color-Theme', 'Bard-Light-Theme');
      localStorage.setItem('brd_dctG', 'false');
    } catch (e) {}
  })();
`;

/** Kiểm tra chỉ tiêm CSS vào đúng trang gemini.google.com (bỏ qua accounts.google.com) */
export function isGeminiAppUrl(url = '') {
  try {
    const u = new URL(url);
    return u.hostname === 'gemini.google.com';
  } catch {
    return String(url).includes('://gemini.google.com');
  }
}

/**
 * Gắn bộ lắng nghe tự động tiêm CSS & Light Theme vào thẻ `<webview id="gemini-webview">`
 * mỗi khi trang tải xong (`dom-ready`) hoặc chuyển hướng nội bộ (`did-navigate-in-page`).
 */
export function attachGeminiWebviewCssInjector(webviewEl) {
  if (!webviewEl) return () => {};

  const inject = async () => {
    try {
      const currentUrl = typeof webviewEl.getURL === 'function' ? webviewEl.getURL() : webviewEl.src;
      if (!isGeminiAppUrl(currentUrl)) return;
      if (typeof webviewEl.setZoomFactor === 'function') {
        webviewEl.setZoomFactor(0.9);
      }
      if (typeof webviewEl.executeJavaScript === 'function') {
        await webviewEl.executeJavaScript(GEMINI_LIGHT_THEME_SCRIPT).catch(() => {});
      }
      await webviewEl.insertCSS(GEMINI_PASTEL_CSS);
    } catch {
      /* webview chưa sẵn sàng */
    }
  };

  webviewEl.addEventListener('dom-ready', inject);
  webviewEl.addEventListener('did-navigate', inject);
  webviewEl.addEventListener('did-navigate-in-page', inject);

  return () => {
    webviewEl.removeEventListener('dom-ready', inject);
    webviewEl.removeEventListener('did-navigate', inject);
    webviewEl.removeEventListener('did-navigate-in-page', inject);
  };
}
