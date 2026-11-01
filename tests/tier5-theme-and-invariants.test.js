import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { imageKitService } from '../src/services/imageKitService.js'

describe('Tier 5: Brand Theme Alignment & Architectural Invariants (F1, F3, F20)', () => {
  it('should ensure tailwind.config.js primary tokens match meat red (#991b1b)', () => {
    const tailwindPath = path.resolve(process.cwd(), 'tailwind.config.js')
    const content = fs.readFileSync(tailwindPath, 'utf-8')
    assert.ok(content.includes("'#991b1b'"), 'tailwind.config.js must contain meat red #991b1b')
    assert.ok(content.includes("'#450a0a'"), 'tailwind.config.js must contain deep burgundy container #450a0a')
  })

  it('should ensure tailwind.config.js secondary tokens match crimson (#b91c1c)', () => {
    const tailwindPath = path.resolve(process.cwd(), 'tailwind.config.js')
    const content = fs.readFileSync(tailwindPath, 'utf-8')
    assert.ok(content.includes("'#b91c1c'"), 'tailwind.config.js must contain crimson #b91c1c')
    assert.ok(content.includes("'#fee2e2'"), 'tailwind.config.js must contain light tint container #fee2e2')
  })

  it('should verify imageKitService exports getTransformedUrl and uploadImage interface contracts', () => {
    assert.ok(imageKitService, 'imageKitService must exist')
    assert.strictEqual(typeof imageKitService.getTransformedUrl, 'function')
    assert.strictEqual(typeof imageKitService.uploadImage, 'function')
    assert.ok(imageKitService.endpoint.includes('ik.imagekit.io'))
  })

  it('should construct valid ImageKit transformation parameters via getTransformedUrl', () => {
    const raw = 'https://ik.imagekit.io/c8zctprqq/customers/photo1.jpg'
    const transformed = imageKitService.getTransformedUrl(raw, { width: 400, height: 300, quality: 85 })

    assert.ok(transformed.includes('tr:w-400,h-300,q-85'))
    assert.ok(transformed.includes('customers/photo1.jpg'))
  })

  it('should handle non-ImageKit or empty URLs in getTransformedUrl safely without crash', () => {
    assert.strictEqual(imageKitService.getTransformedUrl(''), '')
    assert.strictEqual(imageKitService.getTransformedUrl(null), '')
    const local = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
    assert.strictEqual(imageKitService.getTransformedUrl(local, { width: 100 }), local)
  })

  it('should verify all existing and new test files obey 500 lines hard limit', () => {
    const testFiles = fs.readdirSync(path.resolve(process.cwd(), 'tests'))
      .filter((f) => f.endsWith('.test.js'))

    testFiles.forEach((file) => {
      const fullPath = path.resolve(process.cwd(), 'tests', file)
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').length
      assert.ok(lines <= 500, `Test file ${file} exceeded 500 lines limit (${lines} lines)`)
    })
  })
})
