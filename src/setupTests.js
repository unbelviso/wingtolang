import '@testing-library/jest-dom/vitest'
import './jestGlobalShim.js'
import 'jest-canvas-mock'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
