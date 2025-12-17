import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

interface UseSearchWithDebounceOptions {
  /**
   * Initial value for the search input
   */
  initialValue: string;

  /**
   * Callback invoked after the debounce delay
   */
  onDebouncedChange: (value: string) => void;

  /**
   * Debounce delay in milliseconds
   * @default 500
   */
  delay?: number;
}

/**
 * Custom hook that manages search input state with debouncing and pending state tracking.
 *
 * Features:
 * - Local state for immediate visual feedback (no input lag)
 * - Debounced callback to minimize API calls
 * - Automatic pending state management (true during debounce, false after)
 * - Syncs with external value changes (e.g., browser back/forward)
 *
 * @example
 * ```tsx
 * const search = useSearchWithDebounce({
 *   initialValue: searchQuery,
 *   onDebouncedChange: setSearchQuery,
 * });
 *
 * <InputSearch
 *   value={search.value}
 *   onChange={search.onChange}
 *   loading={search.isPending}
 * />
 * ```
 */
export function useSearchWithDebounce({
  initialValue,
  onDebouncedChange,
  delay = 500,
}: UseSearchWithDebounceOptions) {
  // Local state for immediate input updates (no lag)
  const [localValue, setLocalValue] = useState(initialValue);

  // Track if we're waiting for debounce to complete
  const [isPending, setIsPending] = useState(false);

  // Debounced callback - triggers after delay
  const debouncedChange = useDebouncedCallback((value: string) => {
    onDebouncedChange(value);
    setIsPending(false); // Clear pending state when debounce completes
  }, delay);

  // Handle input change: update local state immediately + debounce API call
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value); // Immediate visual feedback
    setIsPending(true); // Set pending state immediately on keystroke
    debouncedChange(value); // Debounced API call
  };

  // Sync local state when initialValue prop changes (e.g., browser back/forward)
  useEffect(() => {
    setLocalValue(initialValue);
    setIsPending(false); // Clear pending when external value changes
  }, [initialValue]);

  return {
    /**
     * Current value for the input field
     */
    value: localValue,

    /**
     * onChange handler for the input field
     */
    onChange: handleChange,

    /**
     * True while waiting for debounce to complete
     */
    isPending,
  };
}
