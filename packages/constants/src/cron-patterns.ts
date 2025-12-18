// https://crontab.guru/

export const CRON_PATTERNS = {
  EVERY_1_MINUTE: '* * * * *', // For testing
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_25_MINUTES: '*/25 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_1_HOUR_30_MINUTES: '*/30 */1 * * *',
  EVERY_2_HOURS: '0 */2 * * *',
  EVERY_4_HOURS: '0 */4 * * *',
  EVERY_DAY: '0 0 * * *',
  EVERY_SUNDAY_2AM: '0 2 * * 0',
} as const
