import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/* jsdom, and any renderer without matchMedia, answers no rather than
   throwing: the animated path is the one the product ships, so an unknown
   preference is not a reason to strip it. */
function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(QUERY)
}

/** Whether the viewer asked the system for less motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => mediaQuery()?.matches ?? false)

  useEffect(() => {
    const media = mediaQuery()
    if (!media) return
    const update = (): void => {
      setReduced(media.matches)
    }
    /* Read once on mount as well: the preference can have changed between the
       first render and this effect, and on a server render it was never read. */
    update()
    media.addEventListener('change', update)
    return () => {
      media.removeEventListener('change', update)
    }
  }, [])

  return reduced
}
