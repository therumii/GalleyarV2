/**
 * Rich Graphical Sticker Library
 * High-quality vector SVG stickers across multiple creative categories.
 */

export interface StickerCategory {
  id: string;
  name: string;
  iconName?: string;
}

export interface StickerGraphic {
  id: string;
  name: string;
  category: string;
  svgContent: string;
  aspectRatio?: number;
}

export const STICKER_CATEGORIES: StickerCategory[] = [
  { id: "featured", name: "Featured" },
  { id: "shapes", name: "Shapes" },
  { id: "love", name: "Love" },
  { id: "travel", name: "Travel" },
  { id: "nature", name: "Nature" },
  { id: "food", name: "Food" },
  { id: "fun", name: "Fun" },
  { id: "labels", name: "Labels" },
  { id: "decorative", name: "Decorative" },
];

export const STICKER_LIBRARY: StickerGraphic[] = [
  // ================= FEATURED =================
  {
    id: "feat-golden-star",
    name: "Golden Star",
    category: "featured",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFE259" />
          <stop offset="1" stop-color="#FFA751" />
        </linearGradient>
        <filter id="glowStar" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#FFA751" flood-opacity="0.5"/>
        </filter>
      </defs>
      <path d="M50 5 L62 35 L95 38 L70 60 L78 92 L50 74 L22 92 L30 60 L5 38 L38 35 Z" fill="url(#goldGrad)" stroke="#FFF" stroke-width="3" filter="url(#glowStar)" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="12" fill="#FFF" opacity="0.3" filter="blur(2px)"/>
    </svg>`,
  },
  {
    id: "feat-camera-badge",
    name: "Vintage Camera",
    category: "featured",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="25" width="80" height="55" rx="12" fill="#1E293B" stroke="#F8FAFC" stroke-width="3"/>
      <path d="M32 25 L38 15 L62 15 L68 25 Z" fill="#334155" stroke="#F8FAFC" stroke-width="2"/>
      <circle cx="50" cy="52" r="20" fill="#0F172A" stroke="#38BDF8" stroke-width="4"/>
      <circle cx="50" cy="52" r="14" fill="#0284C7"/>
      <circle cx="45" cy="47" r="4" fill="#FFF" opacity="0.8"/>
      <rect x="72" y="32" width="10" height="6" rx="2" fill="#EF4444"/>
      <circle cx="22" cy="35" r="3" fill="#E2E8F0"/>
    </svg>`,
  },
  {
    id: "feat-sparkle-burst",
    name: "Magic Sparkles",
    category: "featured",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="magicGrad" x1="0" y1="0" x2="100" y2="100">
          <stop stop-color="#C084FC" />
          <stop offset="1" stop-color="#F472B6" />
        </linearGradient>
      </defs>
      <path d="M50 0 C50 25 75 50 100 50 C75 50 50 75 50 100 C50 75 25 50 0 50 C25 50 50 25 50 0 Z" fill="url(#magicGrad)" stroke="#FFF" stroke-width="2"/>
      <path d="M80 10 C80 18 88 25 95 25 C88 25 80 32 80 40 C80 32 72 25 65 25 C72 25 80 18 80 10 Z" fill="#FDE047" stroke="#FFF" stroke-width="1.5"/>
      <circle cx="25" cy="80" r="4" fill="#FFF"/>
    </svg>`,
  },
  {
    id: "feat-neon-heart",
    name: "Neon Glow Heart",
    category: "featured",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="neonPink" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#EC4899" flood-opacity="0.8"/>
        </filter>
      </defs>
      <path d="M50 86 C50 86 12 58 12 32 C12 18 24 10 36 10 C44 10 48 14 50 18 C52 14 56 10 64 10 C76 10 88 18 88 32 C88 58 50 86 50 86 Z" fill="#F43F5E" stroke="#FFF" stroke-width="3" filter="url(#neonPink)"/>
      <path d="M25 25 C30 18 38 18 42 22" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },

  // ================= SHAPES =================
  {
    id: "shape-arrow-curved",
    name: "Doodle Arrow",
    category: "shapes",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 80 C25 30 65 20 80 45" stroke="#FBBF24" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M60 48 L83 47 L82 25" stroke="#FBBF24" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M15 80 C25 30 65 20 80 45" stroke="#FFF" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M60 48 L83 47 L82 25" stroke="#FFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
  },
  {
    id: "shape-speech-bubble",
    name: "Speech Bubble",
    category: "shapes",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 25 C10 14 20 8 32 8 L68 8 C80 8 90 14 90 25 L90 55 C90 66 80 72 68 72 L35 72 L18 88 L22 72 L18 72 C12 72 10 66 10 55 Z" fill="#6366F1" stroke="#FFF" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="35" cy="40" r="4" fill="#FFF"/>
      <circle cx="50" cy="40" r="4" fill="#FFF"/>
      <circle cx="65" cy="40" r="4" fill="#FFF"/>
    </svg>`,
  },
  {
    id: "shape-burst-badge",
    name: "Burst Badge",
    category: "shapes",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="burstGrad" x1="0" y1="0" x2="100" y2="100">
          <stop stop-color="#F97316"/>
          <stop offset="1" stop-color="#EF4444"/>
        </linearGradient>
      </defs>
      <path d="M50 5 L58 20 L75 12 L75 30 L92 32 L82 48 L95 60 L80 68 L85 85 L68 80 L62 95 L50 85 L38 95 L32 80 L15 85 L20 68 L5 60 L18 48 L8 32 L25 30 L25 12 L42 20 Z" fill="url(#burstGrad)" stroke="#FFF" stroke-width="3" stroke-linejoin="round"/>
      <text x="50" y="55" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="18" fill="#FFF" text-anchor="middle">WOW!</text>
    </svg>`,
  },
  {
    id: "shape-circle-ring",
    name: "Focus Ring",
    category: "shapes",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" stroke="#38BDF8" stroke-width="6" stroke-dasharray="12 6" fill="none"/>
      <circle cx="50" cy="50" r="30" stroke="#FFF" stroke-width="3" fill="none"/>
      <circle cx="50" cy="50" r="6" fill="#38BDF8"/>
    </svg>`,
  },

  // ================= LOVE =================
  {
    id: "love-double-heart",
    name: "Sweet Hearts",
    category: "love",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M42 68 C42 68 15 48 15 28 C15 16 25 10 34 10 C40 10 43 14 45 18 C47 14 50 10 56 10 C65 10 75 16 75 28 C75 48 42 68 42 68 Z" fill="#FB7185" stroke="#FFF" stroke-width="2.5"/>
      <path d="M68 85 C68 85 48 70 48 55 C48 46 55 42 62 42 C67 42 69 45 70 48 C71 45 73 42 78 42 C85 42 92 46 92 55 C92 70 68 85 68 85 Z" fill="#F43F5E" stroke="#FFF" stroke-width="2"/>
      <path d="M26 22 C30 17 36 17 38 20" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "love-cupid-arrow",
    name: "Cupid Arrow Heart",
    category: "love",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 82 C50 82 15 56 15 32 C15 18 26 12 37 12 C44 12 48 16 50 20 C52 16 56 12 63 12 C74 12 85 18 85 32 C85 56 50 82 50 82 Z" fill="#E11D48" stroke="#FFF" stroke-width="3"/>
      <line x1="10" y1="85" x2="88" y2="15" stroke="#FDE047" stroke-width="5" stroke-linecap="round"/>
      <polygon points="90,12 80,14 86,22" fill="#FDE047" stroke="#FFF" stroke-width="1.5"/>
      <path d="M12,83 L18,92 M15,80 L25,88" stroke="#FDE047" stroke-width="4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "love-kiss-mark",
    name: "Kiss Lips",
    category: "love",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 52 C25 40 40 38 50 46 C60 38 75 40 85 52 C75 58 60 54 50 56 C40 54 25 58 15 52 Z" fill="#BE123C" stroke="#FFF" stroke-width="2"/>
      <path d="M22 55 C35 75 65 75 78 55 C65 65 35 65 22 55 Z" fill="#E11D48" stroke="#FFF" stroke-width="2"/>
    </svg>`,
  },

  // ================= TRAVEL =================
  {
    id: "travel-airplane-stamp",
    name: "Flight Stamp",
    category: "travel",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="42" stroke="#0284C7" stroke-width="3" stroke-dasharray="4 3" fill="#E0F2FE"/>
      <circle cx="50" cy="50" r="36" stroke="#0284C7" stroke-width="1.5" fill="none"/>
      <path d="M50 20 L58 42 L82 48 L58 56 L62 76 L50 68 L38 76 L42 56 L18 48 L42 42 Z" fill="#0284C7" stroke="#FFF" stroke-width="2" stroke-linejoin="round"/>
      <text x="50" y="88" font-family="sans-serif" font-weight="bold" font-size="7" fill="#0369A1" text-anchor="middle" letter-spacing="2">PASSPORT</text>
    </svg>`,
  },
  {
    id: "travel-palm-sun",
    name: "Tropical Paradise",
    category: "travel",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="28" fill="#FBBF24"/>
      <path d="M52 85 C50 60 45 45 42 35" stroke="#92400E" stroke-width="5" stroke-linecap="round"/>
      <path d="M42 35 C30 25 15 28 8 36 C18 42 32 40 42 35 Z" fill="#16A34A" stroke="#FFF" stroke-width="1.5"/>
      <path d="M42 35 C45 20 60 15 72 20 C68 28 55 32 42 35 Z" fill="#15803D" stroke="#FFF" stroke-width="1.5"/>
      <path d="M42 35 C58 35 75 42 82 52 C70 55 55 48 42 35 Z" fill="#22C55E" stroke="#FFF" stroke-width="1.5"/>
      <path d="M10 88 C35 82 65 82 90 88" stroke="#38BDF8" stroke-width="6" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "travel-mountain-peak",
    name: "Mountain Adventure",
    category: "travel",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,15 88,80 12,80" fill="#475569" stroke="#FFF" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="50,15 62,38 54,34 50,42 44,36 38,40" fill="#F8FAFC"/>
      <polygon points="68,40 95,85 42,85" fill="#334155"/>
      <circle cx="25" cy="30" r="10" fill="#FDE047"/>
    </svg>`,
  },

  // ================= NATURE =================
  {
    id: "nature-sunflower",
    name: "Bright Flower",
    category: "nature",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g fill="#FBBF24" stroke="#FFF" stroke-width="2">
        <circle cx="50" cy="25" r="12"/>
        <circle cx="50" cy="75" r="12"/>
        <circle cx="25" cy="50" r="12"/>
        <circle cx="75" cy="50" r="12"/>
        <circle cx="32" cy="32" r="12"/>
        <circle cx="68" cy="68" r="12"/>
        <circle cx="68" cy="32" r="12"/>
        <circle cx="32" cy="68" r="12"/>
      </g>
      <circle cx="50" cy="50" r="18" fill="#78350F" stroke="#FFF" stroke-width="3"/>
      <circle cx="46" cy="46" r="3" fill="#A16207"/>
    </svg>`,
  },
  {
    id: "nature-rainbow",
    name: "Vibrant Rainbow",
    category: "nature",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 75 A35 35 0 0 1 85 75" stroke="#EF4444" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M22 75 A28 28 0 0 1 78 75" stroke="#F59E0B" stroke-width="7" fill="none"/>
      <path d="M29 75 A21 21 0 0 1 71 75" stroke="#10B981" stroke-width="7" fill="none"/>
      <path d="M36 75 A14 14 0 0 1 64 75" stroke="#3B82F6" stroke-width="7" fill="none"/>
      <circle cx="18" cy="75" r="10" fill="#FFF" stroke="#E2E8F0" stroke-width="2"/>
      <circle cx="28" cy="75" r="8" fill="#FFF"/>
      <circle cx="82" cy="75" r="10" fill="#FFF" stroke="#E2E8F0" stroke-width="2"/>
      <circle cx="72" cy="75" r="8" fill="#FFF"/>
    </svg>`,
  },
  {
    id: "nature-crescent-moon",
    name: "Cosmic Moon",
    category: "nature",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M65 15 C40 15 20 35 20 60 C20 85 40 95 65 95 C45 85 40 60 50 40 C56 28 68 20 65 15 Z" fill="#FDE047" stroke="#FFF" stroke-width="3"/>
      <polygon points="78,25 82,35 92,36 84,42 87,52 78,46 69,52 72,42 64,36 74,35" fill="#67E8F9" stroke="#FFF" stroke-width="1.5"/>
      <circle cx="32" cy="55" r="3" fill="#EAB308"/>
      <circle cx="40" cy="72" r="4" fill="#EAB308"/>
    </svg>`,
  },

  // ================= FOOD =================
  {
    id: "food-coffee-cup",
    name: "Hot Coffee",
    category: "food",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 35 L28 75 C29 82 35 88 43 88 L57 88 C65 88 71 82 72 75 L78 35 Z" fill="#451A03" stroke="#FFF" stroke-width="3.5"/>
      <path d="M74 42 C84 42 90 48 90 56 C90 64 82 70 72 70" stroke="#FFF" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="35" rx="28" ry="7" fill="#78350F" stroke="#FFF" stroke-width="3"/>
      <path d="M42 24 C40 18 46 14 42 8" stroke="#FDE68A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M52 24 C50 18 56 14 52 8" stroke="#FDE68A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M62 24 C60 18 66 14 62 8" stroke="#FDE68A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`,
  },
  {
    id: "food-pizza-slice",
    name: "Cheesy Pizza",
    category: "food",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 10 L88 78 C88 78 50 92 12 78 Z" fill="#FBBF24" stroke="#D97706" stroke-width="4"/>
      <path d="M12 78 C50 92 88 78 88 78" stroke="#B45309" stroke-width="8" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="42" r="6" fill="#DC2626"/>
      <circle cx="36" cy="62" r="5" fill="#DC2626"/>
      <circle cx="64" cy="65" r="5" fill="#DC2626"/>
      <circle cx="52" cy="74" r="4" fill="#15803D"/>
      <circle cx="38" cy="48" r="3" fill="#15803D"/>
    </svg>`,
  },
  {
    id: "food-boba-tea",
    name: "Boba Milk Tea",
    category: "food",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 25 L34 85 C35 90 40 94 45 94 L55 94 C60 94 65 90 66 85 L72 25 Z" fill="#FBBF24" opacity="0.9" stroke="#FFF" stroke-width="3"/>
      <ellipse cx="50" cy="25" rx="22" ry="5" fill="#F59E0B" stroke="#FFF" stroke-width="3"/>
      <line x1="50" y1="6" x2="50" y2="80" stroke="#A855F7" stroke-width="6" stroke-linecap="round"/>
      <circle cx="42" cy="78" r="4" fill="#18181B"/>
      <circle cx="56" cy="76" r="4" fill="#18181B"/>
      <circle cx="48" cy="85" r="4" fill="#18181B"/>
      <circle cx="38" cy="86" r="3.5" fill="#18181B"/>
      <circle cx="60" cy="84" r="3.5" fill="#18181B"/>
    </svg>`,
  },

  // ================= FUN =================
  {
    id: "fun-sunglasses",
    name: "Cool Shades",
    category: "fun",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 40 L88 40 L82 68 C80 75 70 78 60 72 L50 62 L40 72 C30 78 20 75 18 68 Z" fill="#0F172A" stroke="#FFF" stroke-width="4" stroke-linejoin="round"/>
      <line x1="30" y1="46" x2="22" y2="65" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
      <line x1="78" y1="46" x2="70" y2="65" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "fun-party-popper",
    name: "Party Confetti",
    category: "fun",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="15,85 55,75 25,45" fill="#F59E0B" stroke="#FFF" stroke-width="3"/>
      <circle cx="58" cy="35" r="5" fill="#EC4899"/>
      <circle cx="75" cy="50" r="4" fill="#3B82F6"/>
      <circle cx="45" cy="20" r="4.5" fill="#10B981"/>
      <path d="M50 48 Q60 30 75 25" stroke="#8B5CF6" stroke-width="3" fill="none"/>
      <path d="M35 32 Q45 10 65 15" stroke="#EF4444" stroke-width="3" fill="none"/>
      <polygon points="80,18 84,24 90,20 86,14" fill="#FBBF24"/>
    </svg>`,
  },
  {
    id: "fun-game-trophy",
    name: "Champion Trophy",
    category: "fun",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 20 L72 20 L66 56 C64 66 56 72 50 72 C44 72 36 66 34 56 Z" fill="#FACC15" stroke="#FFF" stroke-width="3.5"/>
      <path d="M28 26 C16 26 12 36 12 44 C12 52 20 58 32 58" stroke="#FACC15" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M72 26 C84 26 88 36 88 44 C88 52 80 58 68 58" stroke="#FACC15" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="44" y="72" width="12" height="14" fill="#CA8A04"/>
      <rect x="30" y="86" width="40" height="8" rx="3" fill="#713F12" stroke="#FFF" stroke-width="2"/>
      <polygon points="50,32 53,40 62,40 55,46 57,54 50,49 43,54 45,46 38,40 47,40" fill="#FFF"/>
    </svg>`,
  },

  // ================= LABELS =================
  {
    id: "label-approved-stamp",
    name: "Approved Stamp",
    category: "labels",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="28" width="80" height="44" rx="8" stroke="#10B981" stroke-width="5" stroke-dasharray="6 4" fill="#064E3B" fill-opacity="0.4"/>
      <text x="50" y="56" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="13" fill="#10B981" text-anchor="middle" letter-spacing="1.5">APPROVED</text>
      <circle cx="22" cy="50" r="4" fill="#10B981"/>
      <circle cx="78" cy="50" r="4" fill="#10B981"/>
    </svg>`,
  },
  {
    id: "label-new-tag",
    name: "New Ribbon",
    category: "labels",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 30 L80 15 L90 55 L20 70 Z" fill="#EF4444" stroke="#FFF" stroke-width="3"/>
      <text x="50" y="48" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="16" fill="#FFF" text-anchor="middle" transform="rotate(-10 50 48)">NEW!</text>
    </svg>`,
  },
  {
    id: "label-vintage-date",
    name: "Vintage Ticket",
    category: "labels",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="25" width="84" height="50" rx="6" fill="#FEF3C7" stroke="#78350F" stroke-width="3"/>
      <circle cx="8" cy="50" r="6" fill="#0F172A"/>
      <circle cx="92" cy="50" r="6" fill="#0F172A"/>
      <line x1="32" y1="25" x2="32" y2="75" stroke="#78350F" stroke-width="2" stroke-dasharray="3 3"/>
      <text x="62" y="48" font-family="monospace" font-weight="bold" font-size="10" fill="#78350F" text-anchor="middle">ADMIT ONE</text>
      <text x="62" y="62" font-family="monospace" font-size="8" fill="#B45309" text-anchor="middle">№ 082491</text>
    </svg>`,
  },

  // ================= DECORATIVE =================
  {
    id: "deco-washi-tape",
    name: "Washi Tape",
    category: "decorative",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 35 L12 40 L8 45 L12 50 L8 55 L12 60 L8 65 L92 65 L88 60 L92 55 L88 50 L92 45 L88 40 L92 35 Z" fill="#F472B6" fill-opacity="0.85" stroke="#FFF" stroke-width="2"/>
      <line x1="20" y1="35" x2="30" y2="65" stroke="#FFF" stroke-width="2" opacity="0.6"/>
      <line x1="40" y1="35" x2="50" y2="65" stroke="#FFF" stroke-width="2" opacity="0.6"/>
      <line x1="60" y1="35" x2="70" y2="65" stroke="#FFF" stroke-width="2" opacity="0.6"/>
      <line x1="80" y1="35" x2="90" y2="65" stroke="#FFF" stroke-width="2" opacity="0.6"/>
    </svg>`,
  },
  {
    id: "deco-corner-flourish",
    name: "Photo Corner Frame",
    category: "decorative",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 80 L15 25 C15 20 20 15 25 15 L80 15" stroke="#FDE047" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M28 70 L28 32 C28 30 30 28 32 28 L70 28" stroke="#FFF" stroke-width="3" stroke-linecap="round" fill="none"/>
      <circle cx="15" cy="15" r="6" fill="#FDE047" stroke="#FFF" stroke-width="2"/>
    </svg>`,
  },
  {
    id: "deco-botanical-branch",
    name: "Botanical Branch",
    category: "decorative",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 85 C35 65 55 45 85 15" stroke="#84CC16" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M35 65 C25 55 25 42 35 45 C45 48 40 60 35 65 Z" fill="#65A30D" stroke="#FFF" stroke-width="1.5"/>
      <path d="M55 45 C65 35 78 38 75 48 C72 58 60 52 55 45 Z" fill="#65A30D" stroke="#FFF" stroke-width="1.5"/>
      <path d="M70 30 C60 20 62 8 72 10 C82 12 78 24 70 30 Z" fill="#4D7C0F" stroke="#FFF" stroke-width="1.5"/>
      <circle cx="85" cy="15" r="4" fill="#F43F5E"/>
    </svg>`,
  },
];

/**
 * Helper to get stickers by category
 */
export function getStickersByCategory(category: string): StickerGraphic[] {
  if (!category || category === "all") return STICKER_LIBRARY;
  return STICKER_LIBRARY.filter((s) => s.category === category);
}

/**
 * Returns sticker graphics as data URLs or inline SVG components
 */
export function getStickerSvgDataUrl(svgContent: string): string {
  const encoded = encodeURIComponent(svgContent);
  return `data:image/svg+xml;utf8,${encoded}`;
}
