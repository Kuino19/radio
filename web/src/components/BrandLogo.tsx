import Link from 'next/link'

interface BrandLogoProps {
  className?: string
  variant?: 'full' | 'icon' | 'compact'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  href?: string
}

export function BrandLogo({
  className = '',
  variant = 'full',
  size = 'md',
  href = '/',
}: BrandLogoProps) {
  const sizeMap = {
    sm: { icon: 'w-6 h-6', text: 'text-lg', height: 24 },
    md: { icon: 'w-8 h-8', text: 'text-2xl', height: 32 },
    lg: { icon: 'w-10 h-10', text: 'text-3xl', height: 40 },
    xl: { icon: 'w-14 h-14', text: 'text-4xl', height: 56 },
  }

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon Graphic */}
      <div className={`relative shrink-0 ${sizeMap[size].icon}`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Rounded base badge */}
          <rect width="100" height="100" rx="26" fill="#1A1816" stroke="#2A2724" strokeWidth="2" />

          {/* Radiating arcs */}
          <path d="M26 35 A30 30 0 0 0 26 65" stroke="#F2B544" strokeWidth="4.5" strokeLinecap="round" strokeOpacity="0.5" />
          <path d="M74 35 A30 30 0 0 1 74 65" stroke="#F2B544" strokeWidth="4.5" strokeLinecap="round" strokeOpacity="0.5" />

          <path d="M36 41 A18 18 0 0 0 36 59" stroke="#F2B544" strokeWidth="5" strokeLinecap="round" />
          <path d="M64 41 A18 18 0 0 1 64 59" stroke="#F2B544" strokeWidth="5" strokeLinecap="round" />

          {/* Central Beacon & Pillar */}
          <circle cx="50" cy="38" r="6" fill="#FF4A3D" />
          <rect x="46" y="50" width="8" height="24" rx="4" fill="#F4EFE8" />
        </svg>
      </div>

      {/* Typography */}
      {variant !== 'icon' && (
        <span className={`font-display font-black tracking-tight text-[#F4EFE8] leading-none ${sizeMap[size].text}`}>
          LISN
          <span className="relative inline-flex items-baseline">
            <span>R</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF4A3D] ml-0.5 align-baseline" />
          </span>
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-95 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}
