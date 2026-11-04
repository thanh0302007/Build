// ============================================================
// SCRIPT TIÊM CSS & CẦU NỐI CHO <webview id="gemini-webview">
// Tuân thủ PROJECT_RULES.md mục I.1, I.4 và mục IV.1:
//   - Ẩn Sidebar (mat-sidenav), nút menu 3 gạch, banner quảng cáo & phần rườm rà
//   - Ghi đè hệ thống biến màu Material 3 (--gem-sys-color-*) sang bảng màu Cozy Pastel
//   - Nạp trực tiếp font 'Quicksand' vào <webview> (giữ nguyên 100% Material Icons / Google Symbols)
//   - Khắc phục triệt để lỗi lồng 2-3 khung viền quanh tin nhắn User, câu trả lời & ô nhập chat
// ============================================================

export const GEMINI_PASTEL_CSS = `
  /* 1. Ghi đè toàn bộ Token màu Material 3 của Gemini sang bảng màu Cozy Pastel */
  :root,
  html,
  body,
  body.light-theme,
  body.dark-theme {
    color-scheme: light !important;
    --gem-sys-color-surface: #FDFBF7 !important;
    --gem-sys-color-surface-dim: #F7F2EA !important;
    --gem-sys-color-surface-bright: #FFFFFF !important;
    --gem-sys-color-surface-container-lowest: #FFFFFF !important;
    --gem-sys-color-surface-container-low: #FFFDFB !important;
    --gem-sys-color-surface-container: #FFF9F9 !important;
    --gem-sys-color-surface-container-high: #FCEFF1 !important;
    --gem-sys-color-surface-container-highest: #F8E5E8 !important;
    --gem-sys-color-on-surface: #4A4A4A !important;
    --gem-sys-color-on-surface-variant: #8E8A86 !important;
    --gem-sys-color-primary: #D47484 !important;
    --gem-sys-color-primary-container: #FCE8ED !important;
    --gem-sys-color-on-primary-container: #2A2120 !important;
    --gem-sys-color-secondary-container: #FFF3B0 !important;
    --gem-sys-color-outline: #F0EAE1 !important;
    --gem-sys-color-outline-variant: #F0EAE1 !important;

    height: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background-color: #FDFBF7 !important;
    background: #FDFBF7 !important;
    color: #4A4A4A !important;
    font-family: 'Quicksand', 'Nunito', 'Segoe UI', sans-serif !important;
    -webkit-font-smoothing: antialiased !important;
  }

  /* 2. Ẩn Sidebar, nút 3 gạch, banner nâng cấp, hiệu ứng loang màu & dòng miễn trừ dưới đáy */
  mat-sidenav,
  .mat-drawer-backdrop,
  side-navigation-content,
  bard-sidenav,
  side-nav-menu-button,
  chat-app-side-nav-menu-button,
  .menu-button-container,
  chat-loading-animation,
  .lm-glow,
  .blur-bg,
  .autosuggest-scrim,
  chat-app-banners,
  chat-app-announcement-banners,
  .announcement-banner-container,
  upsell-button,
  g1-upsell-button,
  bard-upsell,
  chat-spark-toggle,
  .hallucination-disclaimer,
  condensed-tos-disclaimer,
  .tos-disclaimer,
  footer {
    display: none !important;
  }

  /* 3. Đồng bộ nền Kem ấm #FDFBF7 xuyên suốt mọi khung chứa */
  chat-app-orchestrator,
  chat-app,
  main,
  main.chat-app,
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
    margin-left: 0 !important;
    padding-left: 0 !important;
    max-width: 100% !important;
  }

  /* 4. Thanh tiêu đề mỏng nhẹ trên cùng của Gemini */
  top-bar-actions,
  .top-bar-actions,
  .boqOnegoogleliteOgbOneGoogleBar {
    background: rgba(253, 251, 247, 0.92) !important;
    backdrop-filter: blur(8px) !important;
    border-bottom: 1px solid #F0EAE1 !important;
    min-height: 38px !important;
    padding: 2px 10px !important;
    box-shadow: none !important;
  }

  bard-mode-switcher button,
  model-selector button {
    background-color: #FFFFFF !important;
    border: 1px solid #F0EAE1 !important;
    border-radius: 9999px !important;
    padding: 3px 12px !important;
    color: #4A4A4A !important;
    font-family: 'Quicksand', 'Nunito', sans-serif !important;
    font-weight: 700 !important;
    font-size: 12.5px !important;
    box-shadow: 0 1px 2px rgba(74, 74, 74, 0.04) !important;
  }

  /* Nút Đăng nhập Google khi chưa có phiên (thay thế hoàn toàn màu xanh dương lệch tông) */
  a[href*="accounts.google.com"],
  a[href*="ServiceLogin"],
  a.gb_Ta,
  a.gb_Za,
  .gb_Ta,
  .gb_Za,
  .sign-in-button,
  a[aria-label*="Sign in" i],
  a[aria-label*="Đăng nhập" i],
  button[aria-label*="Sign in" i],
  button[aria-label*="Đăng nhập" i] {
    background-color: var(--cozy-gem-accent, #E5989B) !important;
    background: var(--cozy-gem-accent, #E5989B) !important;
    color: #2A2120 !important;
    border-radius: 9999px !important;
    font-weight: 700 !important;
    border: none !important;
    padding: 5px 14px !important;
    box-shadow: none !important;
  }
  a[href*="accounts.google.com"] *,
  a[href*="ServiceLogin"] *,
  a.gb_Ta *,
  a.gb_Za *,
  a[aria-label*="Sign in" i] *,
  button[aria-label*="Sign in" i] * {
    color: #2A2120 !important;
  }

  /* 5. Bố cục vùng cuộn tin nhắn thoáng đãng, cân đối 2 bên */
  .chat-history-scroll-container {
    padding: 10px 14px 14px 14px !important;
    box-sizing: border-box !important;
  }

  .conversation-container {
    margin: 0 auto 14px auto !important;
    padding: 0 2px !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Màn hình chào ban đầu gọn gàng, ấm áp */
  .zero-state-container,
  .modular-zero-state-container,
  .top-section-container,
  .greeting-container,
  modular-zero-state,
  zero-state {
    --top-section-container-height: auto !important;
    padding-top: 12px !important;
    padding-bottom: 8px !important;
    margin: 0 !important;
    min-height: 0 !important;
  }

  modular-zero-state h1,
  modular-zero-state .gds-display-s,
  modular-zero-state .message-text {
    font-size: 17px !important;
    font-weight: 700 !important;
    line-height: 1.4 !important;
    color: #4A4A4A !important;
  }

  /* 6. Áp dụng font Quicksand cho văn bản, TUYỆT ĐỐI giữ nguyên font của mat-icon / google-symbols */
  p,
  li,
  h1,
  h2,
  h3,
  h4,
  blockquote,
  td,
  th,
  textarea,
  input,
  .markdown,
  .model-response-text,
  .query-text,
  .query-text-line,
  message-content,
  rich-textarea,
  .ql-editor,
  .gds-body-m,
  .gds-body-l,
  .gds-title-m,
  .message-text {
    font-family: 'Quicksand', 'Nunito', 'Segoe UI', sans-serif !important;
  }

  /* ============================================================================
     7. BONG BÓNG TIN NHẮN CỦA NGƯỜI DÙNG (USER QUERY)
     Xóa triệt để mọi viền/nền lồng nhau trên toàn bộ thẻ cha, chỉ giữ 1 bong bóng duy nhất!
     ============================================================================ */
  user-query,
  user-query > *,
  user-query-content,
  user-query-content > *,
  .user-query-container,
  .user-query-bubble-container,
  .user-query-content,
  .query-content,
  .right-align-content {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }

  user-query {
    display: block !important;
    margin-bottom: 6px !important;
  }

  user-query .user-query-bubble-with-background,
  .user-query-bubble-with-background {
    background: linear-gradient(135deg, #FFF5F7 0%, #FCE8ED 100%) !important;
    border: 1px solid #F4ACB7 !important;
    border-radius: 20px 20px 6px 20px !important;
    padding: 10px 16px !important;
    max-width: 88% !important;
    margin-left: auto !important;
    color: #2A2120 !important;
    box-shadow: 0 2px 8px rgba(244, 172, 183, 0.16) !important;
  }

  /* Không cho bất kỳ thẻ con nào bên trong bong bóng tự vẽ thêm khung viền thứ 2 */
  .user-query-bubble-with-background *,
  .user-query-bubble-with-background .query-text,
  .user-query-bubble-with-background .query-text-line {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: #2A2120 !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    line-height: 1.55 !important;
  }

  .user-query-bubble-with-background p {
    margin: 0 !important;
  }

  /* ============================================================================
     8. KHUNG TRẢ LỜI CỦA GEMINI (MODEL RESPONSE)
     Thẻ trắng sữa #FFFFFF viền kem mảnh #F0EAE1, tách biệt thoáng đãng với tin nhắn trên
     ============================================================================ */
  model-response,
  .model-response-container,
  .presented-response-container,
  response-container,
  .response-content {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }

  .response-container {
    background-color: #FFFFFF !important;
    border: 1px solid #F0EAE1 !important;
    border-radius: 20px !important;
    padding: 14px 16px 10px 16px !important;
    margin: 6px 0 12px 0 !important;
    color: #4A4A4A !important;
    box-shadow: 0 3px 12px rgba(74, 74, 74, 0.035) !important;
  }

  .response-container-header {
    margin-bottom: 4px !important;
    min-height: 0 !important;
  }

  .markdown,
  .model-response-text,
  message-content {
    color: #4A4A4A !important;
    font-size: 14px !important;
    line-height: 1.65 !important;
  }

  .markdown h1,
  .markdown h2,
  .markdown h3 {
    color: #2A2120 !important;
    font-weight: 700 !important;
    margin-top: 10px !important;
    margin-bottom: 6px !important;
  }

  .markdown p {
    margin-top: 0 !important;
    margin-bottom: 8px !important;
  }

  .markdown ul,
  .markdown ol {
    padding-left: 18px !important;
    margin-bottom: 8px !important;
  }

  /* Khối Code / JSON hiển thị trên nền hồng phấn nhạt dịu mắt */
  pre,
  code-block,
  .code-block {
    background-color: #FFF9F9 !important;
    border: 1px solid #F0EAE1 !important;
    border-radius: 14px !important;
    color: #4A4A4A !important;
  }

  .code-block-decoration,
  .code-block-header {
    background-color: #FCEFF1 !important;
    border-bottom: 1px solid #F0EAE1 !important;
    border-radius: 14px 14px 0 0 !important;
    color: #4A4A4A !important;
  }

  :not(pre) > code {
    background-color: #FFF3F5 !important;
    color: #B45064 !important;
    padding: 1px 6px !important;
    border-radius: 6px !important;
    font-size: 0.92em !important;
  }

  /* Hàng nút thao tác dưới mỗi tin nhắn nhỏ gọn, tinh tế */
  message-actions button,
  .message-actions button,
  .action-buttons button,
  user-query button,
  model-response button {
    color: #8E8A86 !important;
    transform: scale(0.9);
    transition: all 0.15s ease !important;
  }

  message-actions button:hover,
  .message-actions button:hover,
  .action-buttons button:hover,
  user-query button:hover,
  model-response button:hover {
    color: #4A4A4A !important;
    background-color: #FFF5F7 !important;
    border-radius: 9999px !important;
  }

  /* ============================================================================
     9. KHUNG NHẬP CHAT Ở ĐÁY (INPUT PILL DUY NHẤT - KHÔNG VIỀN KÉP)
     ============================================================================ */
  .bottom-container,
  input-container,
  .input-gradient-overlay,
  .input-area-container,
  .input-area,
  fieldset,
  fieldset.input-area-fieldset,
  .text-input-field,
  .text-input-field_textarea-wrapper,
  rich-textarea {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }

  .bottom-container,
  input-container {
    background-color: #FDFBF7 !important;
    padding: 4px 12px 10px 12px !important;
    margin: 0 !important;
  }

  .input-area-container {
    padding: 0 !important;
    margin: 0 !important;
  }

  input-area-v2 {
    display: block !important;
    background-color: #FFFFFF !important;
    border: 1.5px solid #F4ACB7 !important;
    border-radius: 24px !important;
    color: #4A4A4A !important;
    box-shadow: 0 4px 14px rgba(244, 172, 183, 0.16) !important;
    margin: 0 !important;
    padding: 4px 10px !important;
    min-height: 0 !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
  }

  input-area-v2:focus-within {
    border-color: #E58B9A !important;
    box-shadow: 0 6px 18px rgba(244, 172, 183, 0.26) !important;
  }

  .text-input-field {
    min-height: 36px !important;
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }

  .ql-editor,
  .ql-editor::before {
    color: #4A4A4A !important;
    font-size: 14px !important;
  }

  input-area-v2 button {
    color: #8E8A86 !important;
  }
  input-area-v2 button:hover {
    color: #4A4A4A !important;
    background-color: #FFF5F7 !important;
  }

  button.send-button,
  .send-button-container button,
  button[aria-label*="Send" i],
  button[aria-label*="Gửi" i] {
    background-color: #F4ACB7 !important;
    color: #2A2120 !important;
    border-radius: 9999px !important;
    box-shadow: 0 2px 6px rgba(244, 172, 183, 0.32) !important;
  }
  button.send-button *,
  .send-button-container button * {
    color: #2A2120 !important;
  }

  /* 10. Thanh cuộn siêu mảnh nhẹ nhàng, không chiếm diện tích */
  ::-webkit-scrollbar {
    width: 5px !important;
    height: 5px !important;
  }
  ::-webkit-scrollbar-track {
    background: transparent !important;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(244, 172, 183, 0.55) !important;
    border-radius: 9999px !important;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #F4ACB7 !important;
  }
`;

/**
 * Script chạy trong ngữ cảnh trang Gemini:
 * 1. Luôn giữ chế độ Light Theme (kể cả khi Angular tự gán lại dark-theme)
 * 2. Nạp Google Fonts 'Quicksand' để chữ tiếng Việt bo tròn đồng bộ 100% với CozySpace
 * 3. Gắn thẻ <style id="cozy-gemini-pastel-style"> duy nhất (tránh chồng chéo nhiều lớp CSS)
 */
export const GEMINI_LIGHT_THEME_SCRIPT = `
  (function() {
    try {
      const enforceLight = () => {
        if (!document.body) return;
        if (document.body.classList.contains('dark-theme')) {
          document.body.classList.remove('dark-theme');
        }
        if (!document.body.classList.contains('light-theme')) {
          document.body.classList.add('light-theme');
        }
      };
      enforceLight();
      localStorage.setItem('Bard-Color-Theme', 'Bard-Light-Theme');
      localStorage.setItem('brd_dctG', 'false');

      if (!window.__cozyThemeObserver && document.body) {
        window.__cozyThemeObserver = new MutationObserver(enforceLight);
        window.__cozyThemeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      }

      if (document.head && !document.getElementById('cozy-quicksand-font')) {
        const fontLink = document.createElement('link');
        fontLink.id = 'cozy-quicksand-font';
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap';
        document.head.appendChild(fontLink);
      }

      if (document.head) {
        let styleTag = document.getElementById('cozy-gemini-pastel-style');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'cozy-gemini-pastel-style';
          document.head.appendChild(styleTag);
        }
        styleTag.textContent = ${JSON.stringify(GEMINI_PASTEL_CSS)};
      }
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
        webviewEl.setZoomFactor(0.92);
      }
      const rootStyle =
        typeof window !== 'undefined' ? window.getComputedStyle(document.documentElement) : null;
      const bgApp = rootStyle?.getPropertyValue('--bg-app')?.trim() || '#FAF7F2';
      const bgCard = rootStyle?.getPropertyValue('--bg-card')?.trim() || '#FFFFFF';
      const textPrimary = rootStyle?.getPropertyValue('--text-primary')?.trim() || '#3D3535';
      const textMuted = rootStyle?.getPropertyValue('--text-muted')?.trim() || '#8C7E7E';
      const accent = rootStyle?.getPropertyValue('--accent')?.trim() || '#E5989B';
      const borderSubtle =
        rootStyle?.getPropertyValue('--border-subtle')?.trim() || 'rgba(229, 152, 155, 0.2)';

      const themeOverrideCss = `
        :root, html, body, body.light-theme, body.dark-theme {
          --cozy-gem-accent: ${accent} !important;
          --gem-sys-color-surface: ${bgApp} !important;
          --gem-sys-color-surface-container-lowest: ${bgCard} !important;
          --gem-sys-color-on-surface: ${textPrimary} !important;
          --gem-sys-color-on-surface-variant: ${textMuted} !important;
          --gem-sys-color-primary: ${accent} !important;
          --gem-sys-color-outline: ${borderSubtle} !important;
          background-color: ${bgApp} !important;
          background: ${bgApp} !important;
          color: ${textPrimary} !important;
        }
        chat-app-orchestrator, chat-app, main, main.chat-app, bard-sidenav-container,
        bard-sidenav-content, chat-window, .chat-container, .conversation-container,
        .chat-history-scroll-container, infinite-scroller, mat-sidenav-container,
        mat-sidenav-content, .mat-drawer-container, .mat-drawer-content,
        .bottom-container, input-container {
          background-color: ${bgApp} !important;
          background: ${bgApp} !important;
          color: ${textPrimary} !important;
        }
        .response-container, input-area-v2 {
          background-color: ${bgCard} !important;
          border-color: ${borderSubtle} !important;
          color: ${textPrimary} !important;
        }
        user-query .user-query-bubble-with-background,
        .user-query-bubble-with-background {
          border-color: ${accent} !important;
        }
        button.send-button, .send-button-container button,
        button[aria-label*="Send" i], button[aria-label*="Gửi" i] {
          background-color: ${accent} !important;
        }
      `;

      if (typeof webviewEl.executeJavaScript === 'function') {
        await webviewEl.executeJavaScript(GEMINI_LIGHT_THEME_SCRIPT).catch(() => {});
      }
      await webviewEl.insertCSS(GEMINI_PASTEL_CSS + '\n' + themeOverrideCss);
    } catch {
      /* webview chưa sẵn sàng */
    }
  };

  inject();

  webviewEl.addEventListener('dom-ready', inject);
  webviewEl.addEventListener('did-navigate', inject);
  webviewEl.addEventListener('did-navigate-in-page', inject);

  return () => {
    webviewEl.removeEventListener('dom-ready', inject);
    webviewEl.removeEventListener('did-navigate', inject);
    webviewEl.removeEventListener('did-navigate-in-page', inject);
  };
}
