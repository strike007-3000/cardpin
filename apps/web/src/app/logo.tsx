export default function Logo() {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {/* Sleek Credit Card Contour */}
      <rect 
        x="3" 
        y="4" 
        width="42" 
        height="24" 
        rx="5.5" 
        stroke="var(--color-primary)" 
        strokeWidth="2.2" 
        strokeLinejoin="round"
      />
      {/* Decorative Card Magnetic Stripe Accent on the back (subtle dark line) */}
      <line 
        x1="3" 
        y1="10" 
        x2="45" 
        y2="10" 
        stroke="var(--color-primary)" 
        strokeWidth="1" 
        strokeDasharray="2 3"
        opacity="0.25"
      />
      {/* Stylized Location Pin acting as the EMV Chip */}
      <path 
        d="M10 12C10 9.23858 12.2386 7 15 7C17.7614 7 20 9.23858 20 12C20 15.5 15 21 15 21C15 21 10 15.5 10 12Z" 
        fill="var(--color-primary)" 
        stroke="var(--color-primary)"
        strokeWidth="0.8"
      />
      {/* Center dot in the Pin-Chip */}
      <circle 
        cx="15" 
        cy="12" 
        r="2" 
        fill="var(--bg-base)" 
      />
      {/* Subtle brand dots on the right simulating card details */}
      <circle cx="34" cy="21" r="1.5" fill="var(--color-primary)" opacity="0.3" />
      <circle cx="39" cy="21" r="1.5" fill="var(--color-primary)" opacity="0.3" />
      
      {/* Enhanced decorative elements for premium look */}
      <circle cx="12" cy="26" r="1.5" fill="var(--color-primary)" opacity="0.4" />
      <circle cx="18" cy="26" r="1.5" fill="var(--color-primary)" opacity="0.4" />
      <circle cx="24" cy="26" r="1.5" fill="var(--color-primary)" opacity="0.4" />
    </svg>
  );
}
