export default function TbsLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="The Boundary Shop">
      {/* Bat, crossing behind the ball */}
      <g stroke="#16202E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M8 63 L20 55 L88 34 L96 41 L28 68 Z" fill="#E7EAEE" />
        <path d="M2 68 L8 63 L20 55 L23 61 L11 70 Z" fill="#B9C0CB" />
      </g>

      {/* Outer rings */}
      <circle cx="50" cy="52" r="47" fill="#16202E" />
      <circle cx="50" cy="52" r="40" fill="#BFD732" />

      {/* Ball */}
      <g>
        <circle cx="50" cy="52" r="24" fill="#A9CE2E" stroke="#16202E" strokeWidth="3" />
        <path
          d="M33 33c6 3 10 11 10 19s-4 16-10 19M67 33c-6 3-10 11-10 19s4 16 10 19"
          stroke="#16202E"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="58" cy="43" r="4.5" fill="#E4F0A8" opacity="0.85" />
      </g>

      {/* Curved wordmark */}
      <path id="tbsArc" d="M14 40 A40 40 0 0 1 86 40" fill="none" />
      <text fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" fontWeight="800" fontSize="9.5" fill="#16202E" letterSpacing="0.5">
        <textPath href="#tbsArc" startOffset="50%" textAnchor="middle">
          THE BOUNDARY SHOP
        </textPath>
      </text>

      <text
        x="50"
        y="90"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
        fontWeight="800"
        fontSize="13"
        fill="#16202E"
        letterSpacing="1"
      >
        TBS
      </text>
    </svg>
  );
}
