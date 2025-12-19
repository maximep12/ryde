import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface DebouncedSearchInputProps {
  placeholder?: string
  onSearch: (value: string) => void
  delay?: number
  className?: string
  value?: string
}

/**
 * A search input component with built-in debouncing.
 *
 * This component manages its own local state to provide immediate visual feedback
 * while debouncing the actual search callback. This is particularly useful when
 * the parent component uses 'use no memo' (e.g., with TanStack React Table)
 * as it prevents the entire parent from re-rendering on every keystroke.
 *
 * Optionally accepts a `value` prop for external control (e.g., resetting the input).
 */
export function DebouncedSearchInput({
  placeholder = 'Search...',
  onSearch,
  delay = 300,
  className,
  value: externalValue,
}: DebouncedSearchInputProps) {
  const [value, setValue] = useState(externalValue ?? '')

  useEffect(() => {
    if (externalValue !== undefined) {
      setValue(externalValue)
    }
  }, [externalValue])

  const debouncedSearch = useDebouncedCallback((searchValue: string) => {
    onSearch(searchValue)
  }, delay)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    debouncedSearch(newValue)
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border py-2 pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      />
    </div>
  )
}
