/**
 * Validation utilities for ensuring system constraints are met
 */

import { MONTHLY_SALES_RATE, COMPONENT_TYPES } from '../constants/index.js'

/**
 * Calculate months of coverage for springs after ordering
 */
function calculateSpringCoverage(springInventory, springOrder, size) {
  const currentStock = ['firm', 'medium', 'soft'].reduce(
    (sum, firmness) => sum + (springInventory[firmness][size] || 0),
    0
  )

  const orderedStock = ['firm', 'medium', 'soft'].reduce(
    (sum, firmness) => sum + (springOrder.springs[firmness][size] || 0),
    0
  )

  const totalStock = currentStock + orderedStock
  const monthlySales = MONTHLY_SALES_RATE[size]

  return monthlySales > 0 ? totalStock / monthlySales : Infinity
}

/**
 * Calculate months of coverage for a component after ordering
 */
function calculateComponentCoverage(
  springInventory,
  springOrder,
  componentInventory,
  componentOrder,
  componentId,
  size
) {
  const component = COMPONENT_TYPES.find(c => c.id === componentId)
  if (!component) return 0

  const currentComponentStock = componentInventory[componentId][size] || 0
  const orderedComponents = componentOrder[componentId][size] || 0
  const totalComponentStock = currentComponentStock + orderedComponents

  const monthlySales = MONTHLY_SALES_RATE[size]
  const componentSalesRate = monthlySales * component.multiplier

  return componentSalesRate > 0 ? totalComponentStock / componentSalesRate : Infinity
}

/**
 * Validate that springs and components have equal runway (deplete at same rate)
 *
 * This is a CRITICAL business constraint:
 * - Springs and components arrive in the same container
 * - They must deplete at the same rate to avoid production stops
 * - Difference > 0.5 months = WARNING (King/Queen)
 * - Difference > 1.0 months = WARNING (small sizes - consolidation effects)
 * - Difference > 2.0 months = VIOLATION
 *
 * @param springOrder - Calculated spring order
 * @param componentOrder - Calculated component order
 * @param inventory - Current inventory
 * @param thresholdWarning - Warning threshold in months (default 0.5)
 * @param thresholdViolation - Violation threshold in months (default 2.0)
 */
export function validateEqualRunway(
  springOrder,
  componentOrder,
  inventory,
  thresholdWarning = 0.5,
  thresholdViolation = 2.0
) {
  const violations = []
  const warnings = []

  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']
  const applicableComponents = {
    'King': ['felt', 'top_panel', 'bottom_panel', 'side_panel', 'micro_coils', 'thin_latex'],
    'Queen': ['felt', 'top_panel', 'bottom_panel', 'side_panel', 'micro_coils', 'thin_latex'],
    'Double': ['felt', 'top_panel', 'bottom_panel', 'side_panel'],
    'King Single': ['felt', 'top_panel', 'bottom_panel'],
    'Single': ['felt', 'top_panel', 'bottom_panel']
  }

  // Memoization: Cache coverage calculations to avoid redundant work
  const springCoverageCache = new Map()
  const componentCoverageCache = new Map()

  sizes.forEach(size => {
    // Only validate if this size received an order
    const hasSpringOrder = ['firm', 'medium', 'soft'].some(
      firmness => (springOrder.springs[firmness][size] || 0) > 0
    )

    if (!hasSpringOrder) return // Skip sizes with no order

    // Get or calculate spring coverage (memoized)
    const springCoverageKey = `spring_${size}`
    if (!springCoverageCache.has(springCoverageKey)) {
      springCoverageCache.set(
        springCoverageKey,
        calculateSpringCoverage(inventory.springs, springOrder, size)
      )
    }
    const springCoverage = springCoverageCache.get(springCoverageKey)

    applicableComponents[size].forEach(componentId => {
      // Get or calculate component coverage (memoized)
      const componentCoverageKey = `component_${componentId}_${size}`
      if (!componentCoverageCache.has(componentCoverageKey)) {
        componentCoverageCache.set(
          componentCoverageKey,
          calculateComponentCoverage(
            inventory.springs,
            springOrder,
            inventory.components,
            componentOrder,
            componentId,
            size
          )
        )
      }
      const componentCoverage = componentCoverageCache.get(componentCoverageKey)

      const difference = Math.abs(springCoverage - componentCoverage)

      // Adjust threshold for small sizes (consolidation effects)
      const isSmallSize = ['Double', 'King Single', 'Single'].includes(size)
      const effectiveWarningThreshold = isSmallSize ? 1.0 : thresholdWarning

      const validation = {
        isValid: difference <= effectiveWarningThreshold,
        size,
        componentId,
        springCoverage,
        componentCoverage,
        difference
      }

      if (difference > thresholdViolation) {
        violations.push(validation)
      } else if (difference > effectiveWarningThreshold) {
        warnings.push(validation)
      }
    })
  })

  return {
    allValid: violations.length === 0,
    violations,
    warnings
  }
}

/**
 * Format validation results for display
 */
export function formatValidationMessage(validation) {
  if (validation.allValid && validation.warnings.length === 0) {
    return '✓ Equal Runway Validated - All components will deplete at the same rate as springs'
  }

  const messages = []

  if (validation.violations.length > 0) {
    messages.push('⚠️ CRITICAL: Equal runway violations detected:')
    validation.violations.forEach(v => {
      messages.push(
        `  ${v.size} ${v.componentId}: ${v.difference.toFixed(2)} months difference ` +
        `(Springs: ${v.springCoverage.toFixed(1)}mo, Component: ${v.componentCoverage.toFixed(1)}mo)`
      )
    })
  }

  if (validation.warnings.length > 0) {
    messages.push('⚠️ Warnings:')
    validation.warnings.forEach(w => {
      messages.push(
        `  ${w.size} ${w.componentId}: ${w.difference.toFixed(2)} months difference ` +
        `(Springs: ${w.springCoverage.toFixed(1)}mo, Component: ${w.componentCoverage.toFixed(1)}mo)`
      )
    })
  }

  return messages.join('\n')
}

/**
 * Check if a pallet has exactly 30 springs (constraint validation)
 */
export function validatePalletSize(pallet) {
  return pallet.total === 30
}

/**
 * Check if all pallets in an order have exactly 30 springs
 */
export function validateAllPallets(springOrder) {
  return springOrder.pallets.every(pallet => validatePalletSize(pallet))
}
