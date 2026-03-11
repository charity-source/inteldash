export default function LogoPlaceholder({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="28" width="8" height="14" rx="2" fill="white" opacity="0.7" />
      <rect x="20" y="18" width="8" height="24" rx="2" fill="white" opacity="0.85" />
      <rect x="34" y="6" width="8" height="36" rx="2" fill="white" />
    </svg>
  );
}
