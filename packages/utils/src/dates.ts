import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { DateTime } from 'luxon'

/**
 * @deprecated Use useLocalizedDate instead
 */
export function getFormattedDate(date: Date | string) {
  const parsedDate = typeof date === 'string' ? new Date(date) : date
  return format(parsedDate, 'MMM dd, yyyy, h:mm a')
}

export function getFormattedTimestamp(date?: Date | string) {
  const parsedDate = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
  return format(parsedDate, 'yyyyMMddHHmm')
}

export function getNextWeekFriday(today = new Date()) {
  const dayOfWeek = today.getDay()

  // Get to next week's Sunday
  const daysUntilNextWeek = 7 - dayOfWeek
  const nextWeekSunday = new Date(today)
  nextWeekSunday.setDate(today.getDate() + daysUntilNextWeek)

  // Add 5 days to get to Friday
  const nextWeekFriday = new Date(nextWeekSunday)
  nextWeekFriday.setDate(nextWeekSunday.getDate() + 5)

  return nextWeekFriday
}

export function getUtcRangeForDate(localDate: string, timeZone: string) {
  const start = DateTime.fromISO(`${localDate}T00:00:00`, { zone: timeZone }).toUTC()
  const end = start.plus({ days: 1 })

  return {
    start: start.toISO(),
    end: end.toISO(),
  }
}

export function getYearWeekNumber(date: Date) {
  return formatInTimeZone(date, 'UTC', 'RRRRII')
}
