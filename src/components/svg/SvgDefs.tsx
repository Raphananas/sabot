/**
 * Définitions SVG partagées (enseignes, motif du dos de carte).
 * Montées une seule fois à la racine, référencées via <use href="#...">.
 */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="suit-H" viewBox="0 0 100 100">
          <path d="M50 90 C 47 85 36 74 24 62 C 12 50 5 41 5 29 C 5 16 15 7 28 7 C 38 7 46 13 50 23 C 54 13 62 7 72 7 C 85 7 95 16 95 29 C 95 41 88 50 76 62 C 64 74 53 85 50 90 Z" />
        </symbol>
        <symbol id="suit-D" viewBox="0 0 100 100">
          <path d="M50 3 C 60 20 72 36 88 50 C 72 64 60 80 50 97 C 40 80 28 64 12 50 C 28 36 40 20 50 3 Z" />
        </symbol>
        <symbol id="suit-S" viewBox="0 0 100 100">
          <path d="M50 4 C 56 16 70 27 82 38 C 92 47 96 55 96 64 C 96 77 86 85 74 85 C 65 85 58 80 54 73 C 55 83 59 90 68 96 L 32 96 C 41 90 45 83 46 73 C 42 80 35 85 26 85 C 14 85 4 77 4 64 C 4 55 8 47 18 38 C 30 27 44 16 50 4 Z" />
        </symbol>
        <symbol id="suit-C" viewBox="0 0 100 100">
          <circle cx="50" cy="27" r="20" />
          <circle cx="27" cy="58" r="20" />
          <circle cx="73" cy="58" r="20" />
          <path d="M42 40 L58 40 L60 62 L40 62 Z" />
          <path d="M47 60 C 47 78 42 88 32 96 L 68 96 C 58 88 53 78 53 60 Z" />
        </symbol>
        <linearGradient id="back-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f4553" />
          <stop offset="1" stopColor="#16283a" />
        </linearGradient>
        <pattern id="back-lines" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 V18" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="6" />
        </pattern>
      </defs>
    </svg>
  );
}
