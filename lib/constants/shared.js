export const SEASONAL_DEMAND = [
  1.00,
  1.00,
  1.00,
  1.05,
  1.12,
  1.18,
  1.25,
  1.25,
  1.10,
  1.05,
  1.20,
  1.10
]

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const getSeasonalMultiplier = (monthIndex) => SEASONAL_DEMAND[monthIndex] || 1.0
