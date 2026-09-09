import { useEffect, useRef, RefObject } from 'react'

interface UseIntersectionObserverProps {
  enabled: boolean
  onIntersect: () => void
  rootMargin?: string
  threshold?: number
}

export const useIntersectionObserver = ({
  enabled,
  onIntersect,
  rootMargin = '0px 0px -100px 0px',
  threshold = 0,
}: UseIntersectionObserverProps): RefObject<HTMLDivElement> => {
  const targetRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef(false)
  const onIntersectRef = useRef(onIntersect)

  useEffect(() => {
    onIntersectRef.current = onIntersect
  })

  useEffect(() => {
    if (!enabled) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        if (triggerRef.current) return

        triggerRef.current = true
        onIntersectRef.current()

        requestAnimationFrame(() => {
          setTimeout(() => {
            triggerRef.current = false
          }, 200)
        })
      },
      {
        rootMargin,
        threshold,
      },
    )

    const el = targetRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
      observer.disconnect()
    }
  }, [enabled, rootMargin, threshold])

  return targetRef
}
