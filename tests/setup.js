/**
 * Test setup for Vitest
 */

import { beforeAll, afterEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

beforeAll(() => {
  global.localStorage = localStorageMock
})

afterEach(() => {
  vi.clearAllMocks()
})

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})
