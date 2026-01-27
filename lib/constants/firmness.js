/**
 * FIRMNESS DISTRIBUTION DATA
 *
 * Based on actual customer purchase patterns.
 * Shows clear preference for Medium firmness in larger beds (80%+).
 */

/**
 * Firmness types available.
 */
export const FIRMNESS_TYPES = ['firm', 'medium', 'soft']

/**
 * Firmness distribution by mattress size.
 * Based on actual sales data showing customer preferences.
 *
 * Key insights:
 * - King/Queen: 80%+ Medium, minimal Soft (2-4%)
 * - Smaller sizes: More balanced distribution
 * - Medium dominates across all sizes
 */
export const FIRMNESS_DISTRIBUTION = {
  'King': {
    firm: 0.1356,      // 13.56%
    medium: 0.8446,    // 84.46% (dominant)
    soft: 0.0198       // 1.98%
  },
  'Queen': {
    firm: 0.1344,      // 13.44%
    medium: 0.8269,    // 82.69% (dominant)
    soft: 0.0387       // 3.87%
  },
  'Double': {
    firm: 0.2121,      // 21.21%
    medium: 0.6061,    // 60.61%
    soft: 0.1818       // 18.18%
  },
  'King Single': {
    firm: 0.1622,      // 16.22%
    medium: 0.6216,    // 62.16%
    soft: 0.2162       // 21.62%
  },
  'Single': {
    firm: 0.2500,      // 25.00%
    medium: 0.5833,    // 58.33%
    soft: 0.1667       // 16.67%
  }
}
