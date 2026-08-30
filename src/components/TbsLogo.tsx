export default function TbsLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="The Boundary Shop">
      <circle cx="32" cy="32" r="31" fill="#16202E" />
      <circle cx="32" cy="32" r="27.5" stroke="#BFD732" strokeWidth="2.5" fill="none" />
      <text
        x="32"
        y="39.5"
        textAnchor="middle"
        fontSize="21"
        fontWeight="800"
        letterSpacing="0.5"
        fill="#BFD732"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
      >
        TBS
      </text>
    </svg>
  );
}
