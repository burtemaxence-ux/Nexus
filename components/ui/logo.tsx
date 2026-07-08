type LogoVariant = 'lockup' | 'symbol' | 'mono'
type LogoTheme = 'light' | 'dark'

const SOURCES: Record<string, { src: string; ratio: number }> = {
  lockup: { src: '/brand/quartzbase-lockup-horizontal.svg', ratio: 366 / 100 },
  symbol: { src: '/brand/quartzbase-symbol.svg', ratio: 1 },
  monoLight: { src: '/brand/quartzbase-symbol-mono-light.svg', ratio: 1 },
  monoDark: { src: '/brand/quartzbase-symbol-mono-dark.svg', ratio: 1 },
}

/**
 * Logo officiel Quartzbase (mark cristal + wordmark).
 * - variant="symbol" : mark couleur seul (icônes, avatars, splash).
 * - variant="lockup" : mark + wordmark « quartzbase » (en-têtes, login).
 * - variant="mono" : mark trait une couleur — `theme` choisit la version lisible sur le fond
 *   (theme="light" = fond clair -> trait encre ; theme="dark" = fond sombre -> trait blanc).
 */
export function Logo({
  variant = 'symbol',
  theme = 'dark',
  size = 32,
  className,
}: {
  variant?: LogoVariant
  theme?: LogoTheme
  size?: number
  className?: string
}) {
  const entry =
    variant === 'lockup'
      ? SOURCES.lockup
      : variant === 'mono'
        ? (theme === 'light' ? SOURCES.monoDark : SOURCES.monoLight)
        : SOURCES.symbol

  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG vectoriel local, pas de pipeline d'optimisation raster nécessaire
    <img
      src={entry.src}
      alt="Quartzbase"
      width={Math.round(size * entry.ratio)}
      height={size}
      className={className}
    />
  )
}
