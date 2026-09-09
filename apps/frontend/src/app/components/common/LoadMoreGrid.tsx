import { useState, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'

interface LoadMoreState {
  visibleItems: any[]
  hasMore: boolean
  loadMore: () => void
}

interface LoadMoreGridProps {
  items: any[]
  pageSize?: number
  renderMore?: () => React.ReactNode
  buttonLabel?: string
}

export function useLoadMore({
  items,
  pageSize = 45,
}: {
  items: any[]
  pageSize?: number
}): LoadMoreState {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  useEffect(() => {
    setVisibleCount(pageSize)
  }, [items.length, pageSize])

  const loadMore = useCallback(() => setVisibleCount((count) => count + pageSize), [pageSize])
  const visibleItems = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length

  return { visibleItems, hasMore, loadMore }
}

export default function LoadMoreGrid({
  items,
  pageSize = 15,
  renderMore,
  buttonLabel = 'Lebih banyak',
}: LoadMoreGridProps) {
  const { visibleItems, hasMore, loadMore } = useLoadMore({ items, pageSize })

  return (
    <>
      {visibleItems.map((item, index) => (
        <div key={index}>{item}</div>
      ))}
      {hasMore && (
        <>
          <hr className="border-border" />
          <button
            type="button"
            onClick={loadMore}
            className="mx-auto rounded-full border border-border bg-white px-5 py-2 text-sm font-semibold text-foreground hover:border-accent/40 transition-colors inline-flex items-center justify-center gap-2"
          >
            {buttonLabel}
            <ChevronDown size={16} />
          </button>
          <hr className="border-border" />
        </>
      )}
      {renderMore && renderMore()}
    </>
  )
}
