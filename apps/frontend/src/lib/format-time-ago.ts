/**
 * Format a timestamp as a human-readable relative time string
 * @param timestamp ISO 8601 datetime string
 * @returns Formatted string like "just now", "5m ago", "2h ago", "3d ago"
 */
export function formatTimeAgo(timestamp: string | undefined): string {
  if (!timestamp) return 'Unknown'

  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
