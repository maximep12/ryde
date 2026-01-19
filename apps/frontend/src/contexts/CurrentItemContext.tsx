import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type CurrentItemContextType = {
  currentItems: Map<string, string>
  setCurrentItem: (path: string, label: string) => void
  clearCurrentItem: (path: string) => void
  getLabel: (path: string) => string | undefined
}

const CurrentItemContext = createContext<CurrentItemContextType | null>(null)

export function CurrentItemProvider({ children }: { children: ReactNode }) {
  const [currentItems, setCurrentItems] = useState<Map<string, string>>(new Map())

  const setCurrentItem = useCallback((path: string, label: string) => {
    setCurrentItems((prev) => {
      const next = new Map(prev)
      next.set(path, label)
      return next
    })
  }, [])

  const clearCurrentItem = useCallback((path: string) => {
    setCurrentItems((prev) => {
      const next = new Map(prev)
      next.delete(path)
      return next
    })
  }, [])

  const getLabel = useCallback(
    (path: string) => {
      return currentItems.get(path)
    },
    [currentItems],
  )

  return (
    <CurrentItemContext.Provider
      value={{ currentItems, setCurrentItem, clearCurrentItem, getLabel }}
    >
      {children}
    </CurrentItemContext.Provider>
  )
}

export function useCurrentItem() {
  const context = useContext(CurrentItemContext)
  if (!context) {
    throw new Error('useCurrentItem must be used within a CurrentItemProvider')
  }
  return context
}

/**
 * Hook for pages to register their current item label for sidebar display
 * @param path - The base path (e.g., '/example/clients')
 * @param label - The label to display (e.g., 'GRO-001'), or null/undefined to clear
 */
export function useRegisterCurrentItem(path: string, label: string | null | undefined) {
  const { setCurrentItem } = useCurrentItem()

  // Register/update the label when it changes
  if (label) {
    setCurrentItem(path, label)
  }

  // Note: We don't clear on unmount because the sidebar needs the label
  // even as the page transitions. The next page will overwrite if needed.
}
