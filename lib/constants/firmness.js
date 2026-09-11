/**
 * FIRMNESS DATA
 */

/**
 * Firmness types available (firmest to softest).
 */
export const FIRMNESS_TYPES = ['veryfirm', 'firm', 'medium', 'soft']

// Fixed demand percentages used by the China Store split demand toggle.
// The same values are displayed above the spring timeline.
export const SPRING_PLANNING_SPLITS = {
  kingAndKingSingle: { soft: 0, medium: 4, firm: 38, veryfirm: 58 },
  otherSizes: { soft: 0, medium: 6, firm: 40, veryfirm: 54 }
}

/**
 * Display labels for each firmness type.
 */
export const FIRMNESS_LABELS = {
  veryfirm: 'Very Firm',
  firm: 'Firm',
  medium: 'Medium',
  soft: 'Soft'
}
