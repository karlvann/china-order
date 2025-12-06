/**
 * Central export point for all business constants
 */

export {
  LEAD_TIME_WEEKS,
  SPRINGS_PER_PALLET,
  MIN_PALLETS,
  MAX_PALLETS,
  DEFAULT_PALLETS,
  CRITICAL_THRESHOLD,
  TARGET_COVERAGE
} from './business';

export {
  MATTRESS_SIZES,
  MONTHLY_SALES_RATE,
  SMALL_SIZES,
  HIGH_VELOCITY_SIZES,
  MATTRESS_AVERAGE_PRICE,
  ANNUAL_REVENUE_OPTIONS,
  DEFAULT_ANNUAL_REVENUE,
  getScaledUsageRates
} from './sales';

export {
  FIRMNESS_TYPES,
  FIRMNESS_DISTRIBUTION
} from './firmness';

export {
  BUSY_MONTHS,
  SEASONAL_MULTIPLIER_BUSY,
  SEASONAL_MULTIPLIER_SLOW,
  MONTH_NAMES,
  MONTH_NAMES_FULL,
  getSeasonalMultiplier
} from './seasonality';

export {
  COMPONENT_TYPES,
  KING_QUEEN_ONLY_COMPONENTS,
  NUM_SAVE_SLOTS
} from './components';
