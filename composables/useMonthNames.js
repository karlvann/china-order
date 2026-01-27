/**
 * Composable for month name utilities
 */

import { MONTH_NAMES, MONTH_NAMES_FULL } from '~/lib/constants/index.js'

export function useMonthNames() {
  /**
   * Get short month name (Jan, Feb, etc.)
   */
  const getShortName = (monthIndex) => {
    return MONTH_NAMES[monthIndex % 12]
  }

  /**
   * Get full month name (January, February, etc.)
   */
  const getFullName = (monthIndex) => {
    return MONTH_NAMES_FULL[monthIndex % 12]
  }

  /**
   * Get current month index (0-11)
   */
  const getCurrentMonthIndex = () => {
    return new Date().getMonth()
  }

  /**
   * Get array of month options for dropdown
   */
  const getMonthOptions = () => {
    return MONTH_NAMES_FULL.map((name, index) => ({
      value: index,
      label: name
    }))
  }

  return {
    MONTH_NAMES,
    MONTH_NAMES_FULL,
    getShortName,
    getFullName,
    getCurrentMonthIndex,
    getMonthOptions
  }
}
