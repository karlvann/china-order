/**
 * Tests for weekly sales SKU parsing
 */

import { describe, it, expect } from 'vitest'
import { parseMattressSku, getFirmnessType } from '~/composables/useWeeklySales'

describe('Weekly Sales SKU Parsing', () => {
  describe('getFirmnessType', () => {
    it('returns soft for levels 2-4', () => {
      expect(getFirmnessType(2)).toBe('soft')
      expect(getFirmnessType(3)).toBe('soft')
      expect(getFirmnessType(4)).toBe('soft')
    })

    it('returns medium for levels 5-10', () => {
      expect(getFirmnessType(5)).toBe('medium')
      expect(getFirmnessType(7)).toBe('medium')
      expect(getFirmnessType(10)).toBe('medium')
    })

    it('returns firm for levels 11+', () => {
      expect(getFirmnessType(11)).toBe('firm')
      expect(getFirmnessType(15)).toBe('firm')
      expect(getFirmnessType(19)).toBe('firm')
    })

    it('returns null for invalid levels', () => {
      expect(getFirmnessType(0)).toBe(null)
      expect(getFirmnessType(1)).toBe(null)
    })
  })

  describe('parseMattressSku', () => {
    it('parses Cooper mattress SKUs correctly', () => {
      const result = parseMattressSku('cooper5queen')
      expect(result).toEqual({
        range: 'cooper',
        firmnessLevel: 5,
        firmnessType: 'medium',
        size: 'Queen'
      })
    })

    it('parses Cloud mattress SKUs correctly', () => {
      const result = parseMattressSku('cloud12king')
      expect(result).toEqual({
        range: 'cloud',
        firmnessLevel: 12,
        firmnessType: 'firm',
        size: 'King'
      })
    })

    it('parses Aurora mattress SKUs correctly', () => {
      const result = parseMattressSku('aurora3single')
      expect(result).toEqual({
        range: 'aurora',
        firmnessLevel: 3,
        firmnessType: 'soft',
        size: 'Single'
      })
    })

    it('handles King Single size', () => {
      const result = parseMattressSku('cooper7kingsingle')
      expect(result).toEqual({
        range: 'cooper',
        firmnessLevel: 7,
        firmnessType: 'medium',
        size: 'King Single'
      })
    })

    it('handles Double size', () => {
      const result = parseMattressSku('cloud10double')
      expect(result).toEqual({
        range: 'cloud',
        firmnessLevel: 10,
        firmnessType: 'medium',
        size: 'Double'
      })
    })

    it('is case insensitive', () => {
      const result = parseMattressSku('COOPER5QUEEN')
      expect(result).toEqual({
        range: 'cooper',
        firmnessLevel: 5,
        firmnessType: 'medium',
        size: 'Queen'
      })
    })

    it('returns null for non-mattress SKUs', () => {
      expect(parseMattressSku('springsfirmking')).toBe(null)
      expect(parseMattressSku('pillow')).toBe(null)
      expect(parseMattressSku('accessories')).toBe(null)
    })

    it('returns null for invalid format', () => {
      expect(parseMattressSku('')).toBe(null)
      expect(parseMattressSku(null)).toBe(null)
      expect(parseMattressSku(undefined)).toBe(null)
      expect(parseMattressSku('cooperqueen')).toBe(null) // no firmness level
      expect(parseMattressSku('cooper5')).toBe(null) // no size
    })

    it('returns null for invalid firmness levels', () => {
      expect(parseMattressSku('cooper1queen')).toBe(null) // too low
      expect(parseMattressSku('cooper20queen')).toBe(null) // too high
    })

    it('handles two-digit firmness levels', () => {
      const result = parseMattressSku('cloud15double')
      expect(result).toEqual({
        range: 'cloud',
        firmnessLevel: 15,
        firmnessType: 'firm',
        size: 'Double'
      })
    })
  })
})
