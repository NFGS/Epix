interface IconProps {
  className?: string;
}

const STROKE_WIDTH = 1.7;

function iconProps(className?: string) {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: STROKE_WIDTH,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 20.5 4.8 13.7a5 5 0 0 1 .2-7.3 4.7 4.7 0 0 1 6.6.4l.4.4.4-.4a4.7 4.7 0 0 1 6.6-.4 5 5 0 0 1 .2 7.3Z" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

export function FilmIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

export function TvIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="m8 3 4 4 4-4" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 9v5M12 17.5v.5" />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m12 3.2 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9Z" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18Z" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function HeartFilledIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5 4.8 13.7a5 5 0 0 1 .2-7.3 4.7 4.7 0 0 1 6.6.4l.4.4.4-.4a4.7 4.7 0 0 1 6.6-.4 5 5 0 0 1 .2 7.3Z" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}

export function LocationIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 21s-6.5-5.4-6.5-10.2a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </svg>
  );
}

export function CloudOffIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M7 17a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4 4 0 0 1 1.6 7.6" />
      <path d="m4 4 16 16" />
    </svg>
  );
}

export function FilterIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

export function ActivityIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 3 5 6v5.5c0 4.4 2.9 7.6 7 9.5 4.1-1.9 7-5.1 7-9.5V6Z" />
      <path d="m9 12 2 2 4-4.5" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function LogOutIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </svg>
  );
}
