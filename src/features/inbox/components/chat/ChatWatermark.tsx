import { memo } from 'react';

/**
 * Subtle geometric chat watermark with a modern messaging aesthetic.
 * Uses soft shapes — circles, dots, speech bubbles — for a cleaner, lighter feel.
 */
export const ChatWatermark = memo(function ChatWatermark() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="chat-pattern"
            x="0"
            y="0"
            width="220"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* Speech bubble 1 */}
            <g opacity="0.025" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary">
              <path d="M30 25 Q30 15 40 15 H60 Q70 15 70 25 V40 Q70 50 60 50 H45 L38 57 L40 50 H40 Q30 50 30 40 Z" />
            </g>

            {/* Dot cluster */}
            <g opacity="0.02" fill="currentColor" className="text-primary">
              <circle cx="130" cy="30" r="2" />
              <circle cx="138" cy="30" r="2" />
              <circle cx="146" cy="30" r="2" />
            </g>

            {/* Speech bubble 2 — flipped */}
            <g opacity="0.02" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground">
              <path d="M160 80 Q160 72 168 72 H192 Q200 72 200 80 V92 Q200 100 192 100 H178 L172 106 L174 100 H168 Q160 100 160 92 Z" />
            </g>

            {/* Heart icon — subtle */}
            <g opacity="0.018" fill="none" stroke="currentColor" strokeWidth="0.9" className="text-primary">
              <path d="M95 90 C95 86 90 82 86 82 C80 82 78 88 78 88 C78 88 76 82 70 82 C66 82 61 86 61 90 C61 98 78 108 78 108 C78 108 95 98 95 90 Z" />
            </g>

            {/* Check marks */}
            <g opacity="0.022" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <polyline points="20,120 24,124 32,116" />
              <polyline points="28,120 32,124 40,116" />
            </g>

            {/* Smile */}
            <g opacity="0.02" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground">
              <circle cx="180" cy="150" r="10" />
              <circle cx="177" cy="148" r="1" fill="currentColor" />
              <circle cx="183" cy="148" r="1" fill="currentColor" />
              <path d="M175 153 Q180 157 185 153" />
            </g>

            {/* Paper plane */}
            <g opacity="0.022" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className="text-primary" transform="translate(100, 145) rotate(-15)">
              <path d="M0 12 L24 0 L0 24 L6 12 Z" />
              <line x1="6" y1="12" x2="24" y2="0" />
            </g>

            {/* Dot ring */}
            <g opacity="0.015" fill="currentColor" className="text-muted-foreground">
              <circle cx="50" cy="170" r="1.5" />
              <circle cx="56" cy="165" r="1.5" />
              <circle cx="62" cy="163" r="1.5" />
              <circle cx="68" cy="165" r="1.5" />
              <circle cx="74" cy="170" r="1.5" />
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#chat-pattern)" />
      </svg>
    </div>
  );
});
