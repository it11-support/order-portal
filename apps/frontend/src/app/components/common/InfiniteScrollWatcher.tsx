import React from 'react'

interface InfiniteScrollWatcherProps {
  isLoading: boolean
  isValidating: boolean
  isReachingEnd: boolean
  isEmpty?: boolean
}

export const InfiniteScrollWatcher = React.forwardRef<HTMLDivElement, InfiniteScrollWatcherProps>(
  ({ isLoading, isValidating, isReachingEnd, isEmpty }, ref) => {
    return (
      <div className="w-full flex flex-col items-center justify-center py-6">
        {/* SENTINEL */}
        <div ref={ref} className="h-8 w-full" />

        {/* INITIAL LOADING */}
        {isLoading && <div className="py-6 text-sm text-gray-500">Memuat data...</div>}

        {/* LOAD MORE */}
        {isValidating && !isLoading && !isReachingEnd && (
          <div className="py-3 flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            Loading data berikutnya...
          </div>
        )}

        {/* END */}
        {isReachingEnd && <div className="py-4 text-xs text-gray-400">Tidak ada data lagi</div>}
      </div>
    )
  },
)

InfiniteScrollWatcher.displayName = 'InfiniteScrollWatcher'
