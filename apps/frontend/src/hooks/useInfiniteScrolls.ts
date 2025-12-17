import { useCallback, useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
  /** Called when sentinel enters viewport */
  onLoadMore: () => void;
  /** Whether more data is available */
  hasMore: boolean;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** IntersectionObserver rootMargin - triggers early load (default: "200px") */
  rootMargin?: string;
  /** IntersectionObserver threshold (default: 0) */
  threshold?: number;
  /** Whether the scroll behavior is enabled (default: true) */
  enabled?: boolean;
}

interface UseInfiniteScrollReturn {
  /** Ref to attach to sentinel element at end of list */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Generic hook for infinite scroll using IntersectionObserver.
 *
 * Attach the returned `sentinelRef` to an invisible element at the end of your list.
 * When the sentinel becomes visible, `onLoadMore` will be called automatically.
 *
 * @example
 * ```tsx
 * const { sentinelRef } = useInfiniteScroll({
 *   onLoadMore: fetchNextPage,
 *   hasMore: hasNextPage,
 *   isLoading: isFetchingNextPage,
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <Card key={item.id} {...item} />)}
 *     <div ref={sentinelRef} className="h-1" aria-hidden="true" />
 *     {isFetchingNextPage && <Spinner />}
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = "200px",
  threshold = 0,
  enabled = true,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Memoize callback to prevent observer recreation on every render
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading],
  );

  useEffect(() => {
    // Don't observe if disabled, no more data, or currently loading
    if (!enabled || !hasMore || isLoading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin,
      threshold,
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [handleIntersect, hasMore, isLoading, rootMargin, threshold, enabled]);

  return { sentinelRef };
}
