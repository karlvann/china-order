/**
 * Date utility functions
 */

/**
 * Get the Monday of the current week at midnight local time.
 * Used for calculating week indices in timelines.
 */
export function getCurrentMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}
