export default function TbsLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="The Boundary Shop">
      <circle cx="32" cy="32" r="30" fill="#16202E" />
      <circle cx="32" cy="32" r="26" fill="#BFD732" />
      <circle cx="32" cy="32" r="26" stroke="#16202E" strokeWidth="2" />
      {/* bat */}
      <rect x="36" y="14" width="7" height="26" rx="3.5" transform="rotate(35 36 14)" fill="#E8EDD4" stroke="#16202E" strokeWidth="1.5" />
      {/* ball */}
      <circle cx="30" cy="34" r="12" fill="#D9E84A" stroke="#16202E" strokeWidth="2" />
      <path d="M21 27c4 3 5 10 2 15M39 27c-4 3-5 10-2 15" stroke="#16202E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <text x="32" y="55" textAnchor="middle" fontSize="9" fontWeight="800" fill="#16202E" fontFamily="Arial, sans-serif">TBS</text>
    </svg>
  );
}
