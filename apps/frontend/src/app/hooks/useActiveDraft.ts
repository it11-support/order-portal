import { useSyncExternalStore } from 'react'

// Shared across CatalogPage, SearchPage and CartPage in the same app session.
let activeDraftId: string | null = null
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
const getSnapshot = () => activeDraftId
const getServerSnapshot = () => null
const setActiveDraftId = (id: string | null) => {
  if (activeDraftId === id) return
  activeDraftId = id
  listeners.forEach((listener) => listener())
}
export const useActiveDraft = () => ({
  editingDraftId: useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  setEditingDraftId: setActiveDraftId,
})
