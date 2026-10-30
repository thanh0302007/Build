// ============================================================
// BỘ HÌNH SVG MẶC ĐỊNH (Lớp 1) CHO 9 VỊ TRÍ ẢNH - PROJECT_RULES.md mục III
// Tất cả dùng tông Cozy Pastel, nét viền #4A4A4A (không dùng đen tuyền).
// ============================================================
import { useId } from 'react';

const INK = '#4A4A4A';
const CREAM = '#FFF6EC';

/** id duy nhất & an toàn cho url(#...) khi cùng 1 SVG hiển thị nhiều nơi */
const useSvgId = (prefix) => `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

/** Nét vẽ dày có viền: dùng cho đuôi mèo, đuôi heo... */
const OutlinedStroke = ({ d, fill = CREAM, width = 12 }) => (
  <>
    <path d={d} stroke={INK} strokeWidth={width + 6} strokeLinecap="round" fill="none" />
    <path d={d} stroke={fill} strokeWidth={width} strokeLinecap="round" fill="none" />
  </>
);

const Sparkle = ({ x, y, s = 1, fill = '#FFF3B0' }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -10 C1.5 -2 2 -1.5 10 0 C2 1.5 1.5 2 0 10 C-1.5 2 -2 1.5 -10 0 C-2 -1.5 -1.5 -2 0 -10Z"
    fill={fill}
  />
);

// ---------------------------------------------------------------
// 1. app_bg — Nền kem chấm bi mờ
// ---------------------------------------------------------------
export function AppBgSvg() {
  const p = useSvgId('dots');
  return (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={p} width="38" height="38" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="2.3" fill="#F4ACB7" opacity="0.22" />
          <circle cx="26" cy="26" r="2.3" fill="#A3C9A8" opacity="0.22" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="#FDFBF7" />
      <rect width="100%" height="100%" fill={`url(#${p})`} />
    </svg>
  );
}

// ---------------------------------------------------------------
// 2. dashboard_banner — Góc bàn học ấm cúng bên cửa sổ
// ---------------------------------------------------------------
export function DashboardBannerSvg() {
  const wall = useSvgId('wall');
  const sky = useSvgId('sky');
  return (
    <svg
      viewBox="0 0 1200 300"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={wall} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF9F9" />
          <stop offset="1" stopColor="#FDF1E8" />
        </linearGradient>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E2D4F0" />
          <stop offset="1" stopColor="#FFF3B0" />
        </linearGradient>
      </defs>

      <rect width="1200" height="300" fill={`url(#${wall})`} />
      <circle cx="80" cy="40" r="90" fill="#FFF3B0" opacity="0.35" />
      <circle cx="430" cy="270" r="110" fill="#E2D4F0" opacity="0.28" />
      <circle cx="600" cy="30" r="50" fill="#A3C9A8" opacity="0.15" />
      <Sparkle x={330} y={50} s={0.9} />
      <Sparkle x={540} y={110} s={0.6} fill="#F4ACB7" />
      <Sparkle x={240} y={205} s={0.7} fill="#E2D4F0" />

      {/* Kệ treo tường */}
      <rect x="560" y="70" width="140" height="8" rx="4" fill="#E9DCCB" />
      <rect x="575" y="40" width="14" height="30" rx="3" fill="#F4ACB7" />
      <rect x="592" y="34" width="12" height="36" rx="3" fill="#A3C9A8" />
      <rect x="607" y="44" width="14" height="26" rx="3" fill="#E2D4F0" />
      <circle cx="665" cy="58" r="12" fill="#FFFFFF" stroke="#E9DCCB" strokeWidth="3" />
      <path d="M665 50 v8 h6" stroke="#8E8A86" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Cửa sổ */}
      <g transform="translate(780 26)">
        <rect x="-36" y="-10" width="332" height="9" rx="4.5" fill="#E9DCCB" />
        <rect x="0" y="0" width="260" height="190" rx="18" fill="#FFFFFF" />
        <rect x="12" y="12" width="236" height="166" rx="12" fill={`url(#${sky})`} />
        <circle cx="190" cy="58" r="34" fill="#FFFFFF" opacity="0.5" />
        <circle cx="190" cy="58" r="22" fill="#FFF3B0" />
        <g fill="#FFFFFF">
          <ellipse cx="62" cy="58" rx="26" ry="12" />
          <ellipse cx="80" cy="50" rx="18" ry="14" />
          <ellipse cx="150" cy="112" rx="22" ry="9" />
          <ellipse cx="164" cy="105" rx="14" ry="10" />
        </g>
        <path d="M12 150 Q70 112 130 146 T248 136 V178 H12Z" fill="#A3C9A8" opacity="0.85" />
        <path d="M12 162 Q90 140 160 160 T248 156 V178 H12Z" fill="#8FBF95" opacity="0.6" />
        <rect x="127" y="12" width="6" height="166" fill="#FFFFFF" />
        <rect x="12" y="92" width="236" height="6" fill="#FFFFFF" />
        {/* Rèm cửa */}
        <path d="M-30 -4 H40 C30 60 54 120 30 206 H-30Z" fill="#F4ACB7" opacity="0.92" />
        <path d="M290 -4 H220 C230 60 206 120 230 206 H290Z" fill="#F4ACB7" opacity="0.92" />
        <path d="M-12 -4 C-6 70 -14 140 -6 206" stroke="#FFF9F9" strokeWidth="3" opacity="0.6" fill="none" />
        <path d="M272 -4 C266 70 274 140 266 206" stroke="#FFF9F9" strokeWidth="3" opacity="0.6" fill="none" />
      </g>

      {/* Mặt bàn */}
      <rect x="0" y="236" width="1200" height="12" fill="#F3E4D3" />
      <rect x="0" y="248" width="1200" height="52" fill="#EBD9C6" />

      {/* Đèn bàn */}
      <g transform="translate(640 0)">
        <ellipse cx="30" cy="236" rx="30" ry="6" fill="#E9DCCB" />
        <path d="M30 234 L48 170 L22 140" stroke="#8E8A86" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M-6 150 L36 112 L58 140 Z" fill="#FFF3B0" stroke="#E9DCCB" strokeWidth="3" strokeLinejoin="round" />
        <path d="M14 152 L-10 230 H70 Z" fill="#FFF3B0" opacity="0.35" />
      </g>

      {/* Chồng sách */}
      <g transform="translate(730 0)">
        <rect x="0" y="212" width="110" height="24" rx="5" fill="#F4ACB7" />
        <rect x="10" y="190" width="96" height="22" rx="5" fill="#E2D4F0" />
        <rect x="4" y="170" width="88" height="20" rx="5" fill="#A3C9A8" />
        <rect x="12" y="218" width="70" height="4" rx="2" fill="#FFFFFF" opacity="0.7" />
        <rect x="20" y="196" width="56" height="4" rx="2" fill="#FFFFFF" opacity="0.7" />
        <rect x="14" y="176" width="50" height="4" rx="2" fill="#FFFFFF" opacity="0.7" />
      </g>

      {/* Sổ mở */}
      <g transform="translate(880 0)">
        <path d="M0 236 L18 214 L80 220 L80 236 Z" fill="#FFFFFF" stroke="#E9DCCB" strokeWidth="2" />
        <path d="M160 236 L142 214 L80 220 L80 236 Z" fill="#FFFFFF" stroke="#E9DCCB" strokeWidth="2" />
        <path d="M26 222 L72 226 M24 228 L72 231 M92 226 L136 222 M92 231 L138 228" stroke="#F0EAE1" strokeWidth="2" />
        <rect x="120" y="206" width="44" height="6" rx="3" transform="rotate(-18 142 209)" fill="#F4ACB7" />
      </g>

      {/* Cốc trà */}
      <g transform="translate(1060 0)">
        <path d="M8 182 C4 170 14 164 10 152" stroke="#E9DCCB" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M22 182 C18 170 28 164 24 152" stroke="#E9DCCB" strokeWidth="3" strokeLinecap="round" fill="none" />
        <rect x="-6" y="190" width="44" height="46" rx="10" fill="#FFF9F9" stroke="#F4ACB7" strokeWidth="3" />
        <path d="M38 200 C54 200 54 224 38 224" stroke="#F4ACB7" strokeWidth="4" fill="none" />
        <path d="M10 208 a6 6 0 0 1 12 0 a6 6 0 0 1 -6 9 a6 6 0 0 1 -6 -9Z" fill="#F4ACB7" opacity="0.7" />
      </g>

      {/* Chậu cây */}
      <g transform="translate(1135 0)">
        <ellipse cx="10" cy="170" rx="9" ry="22" transform="rotate(-25 10 170)" fill="#A3C9A8" />
        <ellipse cx="38" cy="166" rx="9" ry="22" transform="rotate(25 38 166)" fill="#8FBF95" />
        <ellipse cx="24" cy="158" rx="8" ry="24" fill="#A3C9A8" />
        <path d="M2 196 H46 L40 236 H8 Z" fill="#E2D4F0" />
        <rect x="-2" y="190" width="52" height="10" rx="5" fill="#D6C4EA" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------
// 3. user_avatar — Mèo kem thắt nơ
// ---------------------------------------------------------------
export function UserAvatarSvg() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="120" height="120" fill="#FFF3B0" />
      <circle cx="20" cy="22" r="6" fill="#FFFFFF" opacity="0.7" />
      <circle cx="102" cy="96" r="8" fill="#FFFFFF" opacity="0.6" />
      <path d="M28 52 L32 18 L56 38 Z" fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M92 52 L88 18 L64 38 Z" fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M34 44 L36 27 L48 38 Z" fill="#F4ACB7" />
      <path d="M86 44 L84 27 L72 38 Z" fill="#F4ACB7" />
      <ellipse cx="60" cy="72" rx="40" ry="34" fill={CREAM} stroke={INK} strokeWidth="3" />
      <ellipse cx="46" cy="70" rx="4" ry="5" fill={INK} />
      <ellipse cx="74" cy="70" rx="4" ry="5" fill={INK} />
      <circle cx="47.5" cy="68" r="1.4" fill="#FFFFFF" />
      <circle cx="75.5" cy="68" r="1.4" fill="#FFFFFF" />
      <ellipse cx="36" cy="82" rx="7" ry="4.5" fill="#F4ACB7" opacity="0.65" />
      <ellipse cx="84" cy="82" rx="7" ry="4.5" fill="#F4ACB7" opacity="0.65" />
      <path d="M57 79 L63 79 L60 83 Z" fill="#F4ACB7" />
      <path d="M54 86 Q57 89 60 86 Q63 89 66 86" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Nơ matcha */}
      <path d="M80 42 L67 33 L67 51 Z" fill="#A3C9A8" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 42 L93 33 L93 51 Z" fill="#A3C9A8" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="80" cy="42" r="3.5" fill="#FFF9F9" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

// ---------------------------------------------------------------
// 4. mascot_focus — Mèo đeo tai nghe đọc sách
// ---------------------------------------------------------------
export function MascotFocusSvg() {
  return (
    <svg viewBox="0 0 240 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="120" cy="218" rx="78" ry="10" fill="#F0EAE1" />
      <OutlinedStroke d="M170 200 C214 200 222 156 200 138" />
      <ellipse cx="120" cy="170" rx="62" ry="48" fill={CREAM} stroke={INK} strokeWidth="3" />
      {/* Tai */}
      <path d="M70 76 L78 30 L108 58 Z" fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M170 76 L162 30 L132 58 Z" fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M78 66 L82 42 L98 58 Z" fill="#F4ACB7" />
      <path d="M162 66 L158 42 L142 58 Z" fill="#F4ACB7" />
      {/* Đầu */}
      <ellipse cx="120" cy="98" rx="58" ry="47" fill={CREAM} stroke={INK} strokeWidth="3" />
      <path d="M108 56 Q114 66 112 72 M120 52 V70 M132 56 Q126 66 128 72" stroke="#F0D9C0" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Tai nghe */}
      <path d="M62 98 C58 28 182 28 178 98" stroke="#F4ACB7" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M62 98 C58 28 182 28 178 98" stroke={INK} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.25" />
      <rect x="50" y="84" width="22" height="36" rx="10" fill="#E2D4F0" stroke={INK} strokeWidth="3" />
      <rect x="168" y="84" width="22" height="36" rx="10" fill="#E2D4F0" stroke={INK} strokeWidth="3" />
      <circle cx="61" cy="102" r="4" fill="#FFF9F9" />
      <circle cx="179" cy="102" r="4" fill="#FFF9F9" />
      {/* Mặt đang tập trung đọc */}
      <path d="M94 100 Q101 106 108 100" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M132 100 Q139 106 146 100" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <ellipse cx="88" cy="114" rx="8" ry="5" fill="#F4ACB7" opacity="0.6" />
      <ellipse cx="152" cy="114" rx="8" ry="5" fill="#F4ACB7" opacity="0.6" />
      <path d="M116 108 L124 108 L120 113 Z" fill="#F4ACB7" />
      <path d="M113 117 Q116.5 121 120 117 Q123.5 121 127 117" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M78 112 H64 M80 120 L66 124 M162 112 H176 M160 120 L174 124" stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      {/* Quyển sách */}
      <path d="M62 148 L120 158 L178 148 L178 198 L120 209 L62 198 Z" fill="#A3C9A8" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M68 150 L120 160 L120 202 L68 192 Z" fill="#FFFFFF" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M172 150 L120 160 L120 202 L172 192 Z" fill="#FFFFFF" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M78 164 L110 170 M78 173 L110 179 M78 182 L102 186 M162 164 L130 170 M162 173 L130 179 M162 182 L138 186" stroke="#F0EAE1" strokeWidth="3" strokeLinecap="round" />
      <path d="M150 150 V170 L155 165 L160 170 V150" fill="#F4ACB7" />
      {/* Bàn chân */}
      <ellipse cx="68" cy="172" rx="11" ry="9" fill={CREAM} stroke={INK} strokeWidth="3" />
      <ellipse cx="172" cy="172" rx="11" ry="9" fill={CREAM} stroke={INK} strokeWidth="3" />
      {/* Nốt nhạc */}
      <g className="animate-floaty">
        <text x="190" y="46" fontSize="26" fill="#F4ACB7" fontFamily="sans-serif">♪</text>
        <text x="30" y="58" fontSize="20" fill="#A3C9A8" fontFamily="sans-serif">♫</text>
        <text x="208" y="80" fontSize="16" fill="#E2D4F0" fontFamily="sans-serif">♪</text>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------
// 5. mascot_break — Mèo nằm ngủ gật
// ---------------------------------------------------------------
export function MascotBreakSvg() {
  return (
    <svg viewBox="0 0 240 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Đệm */}
      <ellipse cx="120" cy="196" rx="100" ry="30" fill="#E2D4F0" stroke={INK} strokeWidth="3" />
      <ellipse cx="120" cy="188" rx="88" ry="20" fill="#EFE6F8" />
      <circle cx="60" cy="200" r="3" fill="#FFFFFF" />
      <circle cx="180" cy="204" r="3" fill="#FFFFFF" />
      <circle cx="120" cy="212" r="3" fill="#FFFFFF" />
      {/* Thân cuộn tròn */}
      <ellipse cx="132" cy="160" rx="68" ry="38" fill={CREAM} stroke={INK} strokeWidth="3" />
      <path d="M140 126 Q146 140 140 150 M160 128 Q166 142 160 152 M120 126 Q126 138 122 148" stroke="#F0D9C0" strokeWidth="4" strokeLinecap="round" fill="none" />
      <OutlinedStroke d="M196 168 C204 196 150 206 100 196" />
      {/* Đầu */}
      <path d="M52 140 L52 104 L76 124 Z" fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M110 136 L114 102 L90 120 Z" fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M57 130 L57 114 L69 124 Z" fill="#F4ACB7" />
      <path d="M106 128 L108 112 L96 121 Z" fill="#F4ACB7" />
      <ellipse cx="82" cy="152" rx="40" ry="32" fill={CREAM} stroke={INK} strokeWidth="3" />
      <path d="M62 150 Q69 156 76 150" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M90 150 Q97 156 104 150" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="60" cy="163" rx="7" ry="4.5" fill="#F4ACB7" opacity="0.6" />
      <ellipse cx="106" cy="163" rx="7" ry="4.5" fill="#F4ACB7" opacity="0.6" />
      <path d="M80 160 L86 160 L83 164 Z" fill="#F4ACB7" />
      <ellipse cx="83" cy="171" rx="3" ry="2.4" fill="#F4ACB7" opacity="0.9" />
      {/* Chân trước */}
      <ellipse cx="70" cy="184" rx="14" ry="8" fill={CREAM} stroke={INK} strokeWidth="3" />
      {/* Bong bóng ngủ & Zzz */}
      <circle cx="116" cy="168" r="7" fill="#FFFFFF" stroke="#E2D4F0" strokeWidth="2" opacity="0.9" />
      <g className="animate-floaty" fontFamily="Quicksand, sans-serif" fontWeight="700">
        <text x="128" y="96" fontSize="22" fill="#A3C9A8">z</text>
        <text x="148" y="74" fontSize="28" fill="#E2D4F0">z</text>
        <text x="174" y="48" fontSize="34" fill="#F4ACB7">Z</text>
      </g>
      <path d="M40 60 a12 12 0 1 0 14 -16 a10 10 0 0 1 -14 16Z" fill="#FFF3B0" />
    </svg>
  );
}

// ---------------------------------------------------------------
// 6. mood_stickers — Bộ 5 icon cảm xúc
// ---------------------------------------------------------------
const FaceBase = ({ fill, children }) => (
  <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="50" cy="52" r="40" fill={fill} stroke={INK} strokeWidth="3" />
    <ellipse cx="36" cy="34" rx="8" ry="4" fill="#FFFFFF" opacity="0.55" transform="rotate(-25 36 34)" />
    {children}
  </svg>
);

export function MoodHappySvg() {
  return (
    <FaceBase fill="#FFF3B0">
      <path d="M30 48 Q36 40 42 48" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M58 48 Q64 40 70 48" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M34 60 Q50 80 66 60 Z" fill="#F4ACB7" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="27" cy="60" rx="6" ry="4" fill="#F4ACB7" opacity="0.7" />
      <ellipse cx="73" cy="60" rx="6" ry="4" fill="#F4ACB7" opacity="0.7" />
    </FaceBase>
  );
}

export function MoodPeacefulSvg() {
  return (
    <FaceBase fill="#CFE5D2">
      <path d="M50 12 C50 4 58 2 62 6 C58 8 54 10 50 12Z" fill="#A3C9A8" stroke={INK} strokeWidth="2" />
      <path d="M30 50 Q36 56 42 50" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M58 50 Q64 56 70 50" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M42 64 Q50 70 58 64" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="28" cy="61" rx="6" ry="4" fill="#F4ACB7" opacity="0.6" />
      <ellipse cx="72" cy="61" rx="6" ry="4" fill="#F4ACB7" opacity="0.6" />
    </FaceBase>
  );
}

export function MoodExcitedSvg() {
  const star = 'M0 -7 L2 -2 L7 -2 L3 1.5 L4.5 7 L0 3.5 L-4.5 7 L-3 1.5 L-7 -2 L-2 -2 Z';
  return (
    <FaceBase fill="#F8C8CF">
      <path d={star} transform="translate(36 46) scale(1.1)" fill="#FFF3B0" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d={star} transform="translate(64 46) scale(1.1)" fill="#FFF3B0" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M36 60 Q50 60 64 60 Q62 78 50 78 Q38 78 36 60Z" fill="#FFF9F9" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M42 70 Q50 66 58 70 Q55 76 50 76 Q45 76 42 70Z" fill="#F4ACB7" />
      <Sparkle x={86} y={18} s={0.9} />
      <Sparkle x={14} y={24} s={0.6} fill="#E2D4F0" />
    </FaceBase>
  );
}

export function MoodTiredSvg() {
  return (
    <FaceBase fill="#E2D4F0">
      <path d="M29 50 H43" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M57 50 H71" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M30 56 Q36 59 42 56 M58 56 Q64 59 70 56" stroke="#B9A6D3" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="50" cy="68" rx="5" ry="6" fill="#FFF9F9" stroke={INK} strokeWidth="2.6" />
      <path d="M76 30 C80 36 82 40 78 43 C74 46 70 40 76 30Z" fill="#FFFFFF" stroke="#B9A6D3" strokeWidth="2" />
      <text x="70" y="22" fontSize="14" fontWeight="700" fill="#8E8A86" fontFamily="Quicksand, sans-serif">z</text>
    </FaceBase>
  );
}

export function MoodSadSvg() {
  return (
    <FaceBase fill="#F0EAE1">
      <ellipse cx="36" cy="50" rx="4" ry="5" fill={INK} />
      <ellipse cx="64" cy="50" rx="4" ry="5" fill={INK} />
      <path d="M28 40 L40 37 M72 40 L60 37" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M40 70 Q50 62 60 70" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M32 58 C28 66 28 70 32 72 C36 70 36 66 32 58Z" fill="#D9CCEE" stroke="#B9A6D3" strokeWidth="1.6" />
      <ellipse cx="72" cy="60" rx="6" ry="4" fill="#F4ACB7" opacity="0.5" />
    </FaceBase>
  );
}

// ---------------------------------------------------------------
// 7. subject_default_cover — Bìa sổ tay môn học
// ---------------------------------------------------------------
export function SubjectCoverSvg() {
  const bg = useSvgId('cover');
  const dots = useSvgId('cdots');
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF9F9" />
          <stop offset="1" stopColor="#F9DDE2" />
        </linearGradient>
        <pattern id={dots} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="2" fill="#FFFFFF" opacity="0.9" />
          <circle cx="16" cy="16" r="2" fill="#F4ACB7" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="300" height="200" fill={`url(#${bg})`} />
      <rect width="300" height="200" fill={`url(#${dots})`} />
      {/* Gáy lò xo */}
      {[20, 46, 72, 98, 124, 150, 176].map((y) => (
        <g key={y}>
          <circle cx="18" cy={y} r="5" fill="#FDFBF7" stroke="#E9DCCB" strokeWidth="2" />
          <path d={`M10 ${y} H22`} stroke="#8E8A86" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ))}
      {/* Băng dính washi */}
      <g transform="rotate(-6 150 30)">
        <rect x="108" y="18" width="90" height="22" fill="#FFF3B0" opacity="0.95" />
        <path d="M118 18 V40 M132 18 V40 M146 18 V40 M160 18 V40 M174 18 V40 M188 18 V40" stroke="#F4ACB7" strokeWidth="3" opacity="0.5" />
      </g>
      {/* Nhãn */}
      <rect x="84" y="62" width="150" height="76" rx="14" fill="#FFFFFF" stroke="#F0EAE1" strokeWidth="3" />
      <rect x="104" y="84" width="110" height="7" rx="3.5" fill="#F4ACB7" opacity="0.6" />
      <rect x="114" y="102" width="90" height="5" rx="2.5" fill="#F0EAE1" />
      <rect x="124" y="116" width="70" height="5" rx="2.5" fill="#F0EAE1" />
      {/* Doodle */}
      <path d="M258 150 l-6 -6 a5 5 0 0 1 6 -7 a5 5 0 0 1 6 7 Z" fill="#F4ACB7" />
      <Sparkle x={262} y={58} s={0.9} />
      <Sparkle x={58} y={168} s={0.6} fill="#E2D4F0" />
      <g transform="rotate(35 240 170)">
        <rect x="200" y="164" width="64" height="12" rx="3" fill="#A3C9A8" />
        <path d="M264 164 L278 170 L264 176 Z" fill="#FFF3B0" />
        <rect x="196" y="164" width="8" height="12" rx="3" fill="#F4ACB7" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------
// 8. expense_piggy — Ống heo tiết kiệm
// ---------------------------------------------------------------
export function ExpensePiggySvg() {
  return (
    <svg viewBox="0 0 200 180" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="100" cy="164" rx="66" ry="8" fill="#F0EAE1" />
      {/* Đồng xu */}
      <g className="animate-floaty">
        <circle cx="104" cy="26" r="16" fill="#FFF3B0" stroke={INK} strokeWidth="3" />
        <circle cx="104" cy="26" r="10" fill="none" stroke="#F4D77A" strokeWidth="2" />
        <text x="104" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fill="#8E8A86" fontFamily="Quicksand, sans-serif">₫</text>
      </g>
      {/* Chân */}
      <rect x="58" y="128" width="20" height="30" rx="8" fill="#F4ACB7" stroke={INK} strokeWidth="3" />
      <rect x="120" y="128" width="20" height="30" rx="8" fill="#F4ACB7" stroke={INK} strokeWidth="3" />
      {/* Đuôi xoắn */}
      <path d="M160 100 c12 -4 14 -16 6 -18 c-8 -2 -8 10 2 10 c8 0 10 -6 10 -10" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Thân */}
      <ellipse cx="100" cy="100" rx="64" ry="48" fill="#F8C8CF" stroke={INK} strokeWidth="3" />
      {/* Tai */}
      <path d="M62 64 L60 36 L86 54 Z" fill="#F4ACB7" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M122 54 L140 34 L142 62 Z" fill="#F4ACB7" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {/* Khe bỏ xu */}
      <rect x="86" y="56" width="34" height="7" rx="3.5" fill={INK} opacity="0.8" />
      <ellipse cx="80" cy="76" rx="10" ry="5" fill="#FFFFFF" opacity="0.5" transform="rotate(-20 80 76)" />
      {/* Mặt */}
      <ellipse cx="62" cy="96" rx="3.6" ry="4.6" fill={INK} />
      <ellipse cx="92" cy="96" rx="3.6" ry="4.6" fill={INK} />
      <ellipse cx="54" cy="110" rx="7" ry="4" fill="#F4ACB7" />
      <ellipse cx="102" cy="110" rx="7" ry="4" fill="#F4ACB7" />
      <ellipse cx="44" cy="104" rx="16" ry="13" fill="#F4ACB7" stroke={INK} strokeWidth="3" />
      <ellipse cx="39" cy="104" rx="2.8" ry="4" fill={INK} opacity="0.75" />
      <ellipse cx="49" cy="104" rx="2.8" ry="4" fill={INK} opacity="0.75" />
      <path d="M70 114 Q77 120 84 114" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* Hoa trang trí */}
      <g transform="translate(136 112)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-6" rx="4" ry="6" fill="#FFF9F9" transform={`rotate(${a})`} />
        ))}
        <circle r="3.5" fill="#FFF3B0" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------
// 9. empty_state — Đám mây nhỏ & chậu cây khi danh sách trống
// ---------------------------------------------------------------
export function EmptyStateSvg() {
  return (
    <svg viewBox="0 0 220 170" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="110" cy="158" rx="70" ry="7" fill="#F0EAE1" />
      {/* Chậu cây */}
      <path d="M94 104 C80 90 82 76 92 72 C96 84 98 94 104 104" fill="#A3C9A8" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M126 104 C140 90 138 76 128 72 C124 84 122 94 116 104" fill="#A3C9A8" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M110 108 V80" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="110" cy="76" rx="7" ry="11" fill="#CFE5D2" stroke={INK} strokeWidth="2.5" />
      <path d="M84 110 H136 L128 154 H92 Z" fill="#F4ACB7" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="80" y="104" width="60" height="12" rx="6" fill="#F8C8CF" stroke={INK} strokeWidth="3" />
      <ellipse cx="102" cy="132" rx="2.6" ry="3.2" fill={INK} />
      <ellipse cx="118" cy="132" rx="2.6" ry="3.2" fill={INK} />
      <path d="M106 139 Q110 142 114 139" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="96" cy="139" rx="4" ry="2.5" fill="#FFF9F9" opacity="0.8" />
      <ellipse cx="124" cy="139" rx="4" ry="2.5" fill="#FFF9F9" opacity="0.8" />
      {/* Mây buồn ngủ */}
      <g className="animate-floaty">
        <path
          d="M150 52 a14 14 0 0 1 4 -27 a18 18 0 0 1 34 -4 a13 13 0 0 1 14 22 a10 10 0 0 1 -4 9 Z"
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M164 38 Q168 41 172 38 M182 38 Q186 41 190 38" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <ellipse cx="160" cy="44" rx="3.5" ry="2" fill="#F4ACB7" opacity="0.8" />
        <ellipse cx="194" cy="44" rx="3.5" ry="2" fill="#F4ACB7" opacity="0.8" />
      </g>
      <Sparkle x={40} y={46} s={0.9} />
      <Sparkle x={62} y={86} s={0.55} fill="#E2D4F0" />
      <Sparkle x={182} y={102} s={0.6} fill="#F4ACB7" />
    </svg>
  );
}
