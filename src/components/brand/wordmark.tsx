const SIZES = {
  sm: { mark: 'h-6 w-6 text-[13px]', text: 'text-sm' },
  md: { mark: 'h-8 w-8 text-[15px]', text: 'text-lg' },
  lg: { mark: 'h-10 w-10 text-lg', text: 'text-2xl' },
} as const

/**
 * The Kynetic wordmark.
 *
 * One component so the logo is identical everywhere it appears. It was
 * previously inline text with a different size and weight on each screen,
 * which is how a brand ends up looking slightly wrong in three places at once.
 *
 * Set in the display face (Space Grotesk) with tightened tracking, against
 * Inter for everything else — the contrast is what makes it read as a mark
 * rather than as a heading that happens to say the product name.
 */
export function Wordmark({
  size = 'md',
  withMark = true,
  className = '',
}: {
  size?: keyof typeof SIZES
  withMark?: boolean
  className?: string
}) {
  const scale = SIZES[size]

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {withMark ? (
        <span
          aria-hidden="true"
          className={`${scale.mark} grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-emerald-400 font-display font-bold leading-none text-primary-foreground`}
        >
          K
        </span>
      ) : null}
      <span className={`${scale.text} font-display font-semibold leading-none tracking-[-0.03em]`}>
        Kynetic
      </span>
    </span>
  )
}
