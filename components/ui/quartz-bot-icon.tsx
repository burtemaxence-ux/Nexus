import type { SVGProps } from 'react'

/**
 * QuartzBot — l'icône de marque de l'assistant Quartzbase.
 * Un cristal de quartz (gemme à facettes) fusionné avec un visage de bot
 * (antenne + deux yeux). Suit l'API des icônes lucide : taille via `className`
 * (h-/w-) et couleur via `currentColor`.
 */
export function QuartzBot({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Antenne du bot */}
      <path d="M12 4.5V3" />
      <circle cx="12" cy="2" r="0.9" fill="currentColor" stroke="none" />
      {/* Corps cristallin (quartz à facettes) */}
      <path d="M6 5h12l3 5-9 11.5L3 10z" />
      {/* Ligne de facette (table de la gemme) */}
      <path d="M3 10h18" />
      {/* Yeux du bot */}
      <circle cx="9.5" cy="13.6" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.6" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  )
}
