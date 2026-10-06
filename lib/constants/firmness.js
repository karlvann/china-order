/** Spring tension, firmest to softest. Latex uses its own constants. */
export const FIRMNESS_TYPES = ['firm', 'medium', 'soft', 'verysoft']

// Same physical spring distribution as before Operation firm ass.
export const SPRING_PLANNING_SPLITS = {
  kingAndKingSingle: { verysoft: 0, soft: 4, medium: 38, firm: 58 },
  otherSizes: { verysoft: 0, soft: 6, medium: 40, firm: 54 }
}

export const FIRMNESS_LABELS = {
  firm: 'Firm',
  medium: 'Medium',
  soft: 'Soft',
  verysoft: 'Very soft'
}
