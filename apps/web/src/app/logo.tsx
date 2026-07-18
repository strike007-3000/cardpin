export default function Logo() {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden="true">
      {/* Pin / location marker */}
      <circle cx="24" cy="16" r="8" fill="var(--color-primary)" />
      <circle cx="24" cy="16" r="3.5" fill="var(--bg-base)" />
      {/* Card body — rounded rectangle behind the pin */}
      <rect x="2" y="4" width="44" height="24" rx="6" fill="var(--bg-card)" stroke="var(--color-primary)" strokeWidth="1.5" />
      {/* Chip accent */}
      <rect x="8" y="7" width="16" height="10" rx="2" fill="var(--color-primary)" opacity="0.35" />
      {/* Pin dot on the card */}
      <circle cx="24" cy="16" r="1.5" fill="#fff" />
    </svg>
  );
}
