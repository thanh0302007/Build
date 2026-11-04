// Nhân vật đồng hành cử động (Living Companion) với 4 trạng thái sống động:
// - idle: thở nhịp nhàng (scaleY 1.03 chu kỳ 3.5s), chớp mắt ngẫu nhiên mỗi 4-6s, tai & đuôi đung đưa nhẹ
// - focus: đeo tai nghe, lắc lư đầu theo nhịp nhạc lofi, nốt nhạc nhỏ bay lên mờ dần
// - celebrate: nảy lên vui vẻ kèm lấp lánh nhẹ và hiện bong bóng thoại khen ngợi trong 4 giây
// - petting: mắt cười tít (như sticker Vui vẻ / Bình yên), tim nhỏ bay lên & đổi câu nhắn khích lệ
import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useImages } from './ImageSlot.jsx';
import { cx } from './ui.jsx';

const PETTING_MESSAGES = [
  'Meow~ Hôm nay bạn đã cố gắng rất nhiều rồi đấy!',
  'Từng bước nhỏ mỗi ngày đều đáng tự hào lắm nha!',
  'Thả lỏng vai một chút và hít thở thật sâu nhé~',
  'Mình luôn ở đây đồng hành cùng bạn qua từng trang sách!',
  'Uống một ngụm nước ấm rồi mình cùng tiếp tục nhé!',
  'Bạn làm tốt lắm! Cứ giữ nhịp độ dịu dàng này nha~',
];

const CELEBRATE_MESSAGES = [
  'Tuyệt vời quá! Bạn vừa hoàn thành thêm một mục tiêu rồi!',
  'Giỏi quá đi! Một bước tiến thật trọn vẹn hôm nay!',
  'Hoan hô! Nỗ lực của bạn đang nở hoa từng chút một!',
  'Xuất sắc lắm! Tự thưởng cho mình một nụ cười thật tươi nhé!',
];

const INK = '#4A4A4A';
const CREAM = '#FFF6EC';

export default function LivingCompanion({
  isFocusing = false,
  isBreak = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  showBubble = true,
}) {
  const { images, openForSlot } = useImages();
  const slotId = isBreak ? 'mascot_break' : 'mascot_focus';
  const customImageSrc = images?.[slotId];

  const [isBlinking, setIsBlinking] = useState(false);
  const [isPetting, setIsPetting] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [petMsgIdx, setPetMsgIdx] = useState(0);
  const [celebrateMsg, setCelebrateMsg] = useState(CELEBRATE_MESSAGES[0]);

  const celebrateTimerRef = useRef(null);
  const petClickTimerRef = useRef(null);

  // Chớp mắt tự nhiên ngẫu nhiên mỗi 4 - 6 giây
  useEffect(() => {
    let blinkTimeout;
    let closeTimeout;

    const scheduleBlink = () => {
      const delay = 4000 + Math.random() * 2000; // 4.0s - 6.0s
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        closeTimeout = setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 160);
      }, delay);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(closeTimeout);
    };
  }, []);

  // Lắng nghe sự kiện hoàn thành việc cần làm (To-do) hoặc xong 1 phiên Pomodoro -> bật trạng thái `celebrate` 4 giây
  useEffect(() => {
    const onCelebrate = (e) => {
      const customText = e?.detail?.message;
      const randomPraise =
        customText || CELEBRATE_MESSAGES[Math.floor(Math.random() * CELEBRATE_MESSAGES.length)];
      setCelebrateMsg(randomPraise);
      setIsCelebrating(true);
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
      celebrateTimerRef.current = setTimeout(() => {
        setIsCelebrating(false);
      }, 4000);
    };

    window.addEventListener('cozy-companion-celebrate', onCelebrate);
    return () => {
      window.removeEventListener('cozy-companion-celebrate', onCelebrate);
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    };
  }, []);

  // Xác định trạng thái hiện tại theo độ ưu tiên: celebrate > petting > focus > idle
  const activeState = isCelebrating
    ? 'celebrate'
    : isPetting
      ? 'petting'
      : isFocusing
        ? 'focus'
        : 'idle';

  const handleMouseEnter = () => {
    setIsPetting(true);
    setPetMsgIdx((prev) => (prev + 1) % PETTING_MESSAGES.length);
  };

  const handleMouseLeave = () => {
    setIsPetting(false);
  };

  const handlePetClick = (e) => {
    e.stopPropagation();
    setIsPetting(true);
    setPetMsgIdx((prev) => (prev + 1) % PETTING_MESSAGES.length);
    if (petClickTimerRef.current) clearTimeout(petClickTimerRef.current);
    petClickTimerRef.current = setTimeout(() => {
      setIsPetting(false);
    }, 3200);
  };

  const bubbleText =
    activeState === 'celebrate'
      ? celebrateMsg
      : activeState === 'petting'
        ? PETTING_MESSAGES[petMsgIdx]
        : null;

  const happyEyes = activeState === 'petting' || activeState === 'celebrate';
  const showHeadphones = activeState === 'focus';

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePetClick}
      title="Chạm hoặc rê chuột để xoa đầu mèo nhỏ nhé~"
      className={cx(
        'group/companion relative inline-flex cursor-pointer select-none items-center justify-center',
        className
      )}
    >
      {/* Bong bóng thoại khích lệ / chúc mừng */}
      {showBubble && bubbleText && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          className={cx(
            'pointer-events-none absolute -top-11 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-2xl px-3 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur-md animate-pop-in',
            size === 'sm' && 'max-w-[210px] whitespace-normal text-center leading-tight'
          )}
        >
          <span>{bubbleText}</span>
          <span
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRight: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
            className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45"
          />
        </div>
      )}

      {/* Nếu người dùng đã tải ảnh riêng trong Kho ảnh, vẫn áp dụng chuyển động sống động quanh ảnh */}
      {customImageSrc ? (
        <div
          className={cx(
            'relative h-full w-full overflow-hidden rounded-full',
            activeState === 'celebrate' ? 'companion-celebrate' : 'companion-breathe',
            activeState === 'focus' && 'companion-head-focus',
            activeState === 'petting' && 'companion-head-pet'
          )}
        >
          <img
            src={customImageSrc}
            alt="Nhân vật đồng hành"
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <svg
          viewBox="0 0 240 240"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Nhân vật đồng hành CozySpace"
          className="overflow-visible"
        >
          {/* Bóng đổ dưới chân */}
          <ellipse cx="120" cy="218" rx="74" ry="9" fill="rgba(74, 74, 74, 0.08)" />

          {/* Nhóm toàn thân: Nảy lên khi Celebrate hoặc Thở nhịp nhàng 3.5s */}
          <g className={activeState === 'celebrate' ? 'companion-celebrate' : 'companion-breathe'}>
            {/* Đuôi đung đưa nhẹ */}
            <g className="companion-tail">
              <path
                d="M168 196 C210 196 220 154 198 136"
                stroke={INK}
                strokeWidth="18"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M168 196 C210 196 220 154 198 136"
                stroke={CREAM}
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Thân mèo kem */}
            <ellipse
              cx="120"
              cy="170"
              rx="60"
              ry="46"
              fill={CREAM}
              stroke={INK}
              strokeWidth="3"
            />
            {/* Yếm ngực mềm */}
            <ellipse cx="120" cy="166" rx="32" ry="24" fill="#FFFFFF" opacity="0.75" />

            {/* Nhóm Đầu + Tai + Biểu cảm + Tai nghe */}
            <g
              className={
                activeState === 'focus'
                  ? 'companion-head-focus'
                  : activeState === 'petting'
                    ? 'companion-head-pet'
                    : 'companion-head-idle'
              }
            >
              {/* Tai trái cử động */}
              <g className="companion-ear-l">
                <path
                  d="M70 76 L78 28 L108 58 Z"
                  fill={CREAM}
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path d="M78 66 L82 40 L98 58 Z" fill="#F4ACB7" />
              </g>

              {/* Tai phải cử động */}
              <g className="companion-ear-r">
                <path
                  d="M170 76 L162 28 L132 58 Z"
                  fill={CREAM}
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path d="M162 66 L158 40 L142 58 Z" fill="#F4ACB7" />
              </g>

              {/* Khuôn mặt */}
              <ellipse
                cx="120"
                cy="98"
                rx="58"
                ry="47"
                fill={CREAM}
                stroke={INK}
                strokeWidth="3"
              />

              {/* Vân trán ấm áp */}
              <path
                d="M108 56 Q114 66 112 72 M120 52 V70 M132 56 Q126 66 128 72"
                stroke="#F0D9C0"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Tai nghe Lofi (Tự động bật khi đang Focus) */}
              {showHeadphones && (
                <g>
                  <path
                    d="M62 98 C58 26 182 26 178 98"
                    stroke="var(--accent)"
                    strokeWidth="9.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <rect
                    x="49"
                    y="83"
                    width="22"
                    height="36"
                    rx="10"
                    fill="#E2D4F0"
                    stroke={INK}
                    strokeWidth="3"
                  />
                  <rect
                    x="169"
                    y="83"
                    width="22"
                    height="36"
                    rx="10"
                    fill="#E2D4F0"
                    stroke={INK}
                    strokeWidth="3"
                  />
                  <circle cx="60" cy="101" r="4" fill="#FFF9F9" />
                  <circle cx="180" cy="101" r="4" fill="#FFF9F9" />
                </g>
              )}

              {/* Đôi mắt: Cười tít khi Petting/Celebrate, hoặc Chớp mắt ngẫu nhiên mỗi 4-6s */}
              {happyEyes ? (
                <g>
                  <path
                    d="M90 101 Q100 90 110 101"
                    stroke={INK}
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M130 101 Q140 90 150 101"
                    stroke={INK}
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              ) : isBlinking || isBreak ? (
                <g>
                  <path
                    d="M92 100 Q100 106 108 100"
                    stroke={INK}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M132 100 Q140 106 148 100"
                    stroke={INK}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              ) : (
                <g>
                  <ellipse cx="100" cy="99" rx="5.2" ry="6.2" fill={INK} />
                  <ellipse cx="140" cy="99" rx="5.2" ry="6.2" fill={INK} />
                  <circle cx="102" cy="96.5" r="2" fill="#FFFFFF" />
                  <circle cx="142" cy="96.5" r="2" fill="#FFFFFF" />
                </g>
              )}

              {/* Má hồng */}
              <ellipse
                cx="86"
                cy="113"
                rx={happyEyes ? '9.5' : '8'}
                ry={happyEyes ? '5.5' : '4.8'}
                fill="#F4ACB7"
                opacity={happyEyes ? '0.8' : '0.58'}
              />
              <ellipse
                cx="154"
                cy="113"
                rx={happyEyes ? '9.5' : '8'}
                ry={happyEyes ? '5.5' : '4.8'}
                fill="#F4ACB7"
                opacity={happyEyes ? '0.8' : '0.58'}
              />

              {/* Mũi & Miệng */}
              <path d="M116 107 L124 107 L120 112 Z" fill="#F4ACB7" />
              {happyEyes ? (
                <path
                  d="M111 116 Q115.5 122 120 116 Q124.5 122 129 116"
                  stroke={INK}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : (
                <path
                  d="M113 116 Q116.5 120 120 116 Q123.5 120 127 116"
                  stroke={INK}
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  fill="none"
                />
              )}

              {/* Râu mèo */}
              <path
                d="M78 111 H64 M80 119 L66 123 M162 111 H176 M160 119 L174 123"
                stroke={INK}
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.55"
              />
            </g>

            {/* Sách mở khi đang Focus, hoặc Tay vẫy vui vẻ khi Celebrate, hoặc Chân tròn ngoan ngoãn khi Idle */}
            {activeState === 'focus' ? (
              <g>
                <path
                  d="M64 150 L120 160 L176 150 L176 198 L120 208 L64 198 Z"
                  fill="#A3C9A8"
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path
                  d="M70 152 L120 162 L120 202 L70 192 Z"
                  fill="#FFFFFF"
                  stroke={INK}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M170 152 L120 162 L120 202 L170 192 Z"
                  fill="#FFFFFF"
                  stroke={INK}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M80 165 L110 171 M80 174 L110 180 M160 165 L130 171 M160 174 L130 180"
                  stroke="#F0EAE1"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <ellipse cx="70" cy="173" rx="10.5" ry="8.5" fill={CREAM} stroke={INK} strokeWidth="3" />
                <ellipse cx="170" cy="173" rx="10.5" ry="8.5" fill={CREAM} stroke={INK} strokeWidth="3" />
              </g>
            ) : activeState === 'celebrate' ? (
              <g>
                <ellipse
                  cx="66"
                  cy="142"
                  rx="11"
                  ry="9"
                  transform="rotate(-25 66 142)"
                  fill={CREAM}
                  stroke={INK}
                  strokeWidth="3"
                />
                <ellipse
                  cx="174"
                  cy="142"
                  rx="11"
                  ry="9"
                  transform="rotate(25 174 142)"
                  fill={CREAM}
                  stroke={INK}
                  strokeWidth="3"
                />
              </g>
            ) : (
              <g>
                <ellipse cx="92" cy="198" rx="13" ry="9" fill={CREAM} stroke={INK} strokeWidth="3" />
                <ellipse cx="148" cy="198" rx="13" ry="9" fill={CREAM} stroke={INK} strokeWidth="3" />
              </g>
            )}
          </g>

          {/* HIỆU ỨNG HẠT BAY THEO TRẠNG THÁI (Nốt nhạc Lofi / Tim nhỏ / Lấp lánh) */}
          {activeState === 'focus' && (
            <g>
              {/* Nốt nhạc 1 */}
              <g className="companion-float-1" transform="translate(192, 54)">
                <circle cx="0" cy="10" r="4" fill="var(--accent)" />
                <path d="M3.5 10 V-2 L12 0 V4 L3.5 2" fill="var(--accent)" />
                <path d="M3.5 10 V-2 L12 0" stroke="var(--accent)" strokeWidth="2" fill="none" />
              </g>
              {/* Nốt nhạc 2 */}
              <g className="companion-float-2" transform="translate(34, 62)">
                <circle cx="0" cy="10" r="3.5" fill="#A3C9A8" />
                <circle cx="11" cy="8" r="3.5" fill="#A3C9A8" />
                <path d="M3 10 V-1 L14 -3 V8" stroke="#A3C9A8" strokeWidth="2.2" fill="none" />
              </g>
              {/* Nốt nhạc 3 */}
              <g className="companion-float-3" transform="translate(202, 88)">
                <circle cx="0" cy="8" r="3.2" fill="#E2D4F0" />
                <path d="M2.8 8 V-2 L9 0" stroke="#D1BBE8" strokeWidth="2" fill="none" />
              </g>
            </g>
          )}

          {activeState === 'petting' && (
            <g>
              <path
                className="companion-float-1"
                transform="translate(186, 46) scale(0.95)"
                d="M12 6 C12 2.5 9 0 6 0 C3.5 0 1.5 1.5 0 3.8 C-1.5 1.5 -3.5 0 -6 0 C-9 0 -12 2.5 -12 6 C-12 11 0 16 0 19 C0 16 12 11 12 6 Z"
                fill="#F4ACB7"
              />
              <path
                className="companion-float-2"
                transform="translate(46, 54) scale(0.75)"
                d="M12 6 C12 2.5 9 0 6 0 C3.5 0 1.5 1.5 0 3.8 C-1.5 1.5 -3.5 0 -6 0 C-9 0 -12 2.5 -12 6 C-12 11 0 16 0 19 C0 16 12 11 12 6 Z"
                fill="var(--accent)"
              />
              <path
                className="companion-float-3"
                transform="translate(120, 22) scale(0.7)"
                d="M12 6 C12 2.5 9 0 6 0 C3.5 0 1.5 1.5 0 3.8 C-1.5 1.5 -3.5 0 -6 0 C-9 0 -12 2.5 -12 6 C-12 11 0 16 0 19 C0 16 12 11 12 6 Z"
                fill="#F4ACB7"
              />
            </g>
          )}

          {activeState === 'celebrate' && (
            <g>
              <path
                className="companion-sparkle-1"
                d="M42 40 C43.5 48 44 48.5 52 50 C44 51.5 43.5 52 42 60 C40.5 52 40 51.5 32 50 C40 48.5 40.5 48 42 40Z"
                fill="#FFF3B0"
                stroke="var(--accent)"
                strokeWidth="1"
              />
              <path
                className="companion-sparkle-2"
                d="M196 36 C197.5 44 198 44.5 206 46 C198 47.5 197.5 48 196 56 C194.5 48 194 47.5 186 46 C194 44.5 194.5 44 196 36Z"
                fill="var(--accent)"
              />
              <path
                className="companion-sparkle-3"
                d="M198 104 C199 110 199.5 110.5 205 112 C199.5 113.5 199 114 198 120 C197 114 196.5 113.5 191 112 C196.5 110.5 197 110 198 104Z"
                fill="#A3C9A8"
              />
            </g>
          )}
        </svg>
      )}

      {/* Nút nhỏ đổi ảnh tùy chọn khi rê chuột vào góc trên phải */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openForSlot?.(slotId);
        }}
        title="Tùy chỉnh hình nhân vật trong Kho ảnh"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
        className="absolute right-0 top-0 z-20 flex h-6 w-6 items-center justify-center rounded-full opacity-0 shadow-sm transition hover:text-cozy-text group-hover/companion:opacity-100"
      >
        <ImagePlus size={11} strokeWidth={1.75} />
      </button>
    </div>
  );
}

