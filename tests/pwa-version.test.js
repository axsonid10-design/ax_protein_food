import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('PWA & Version Consistency Invariants', () => {
  const pkgPath = path.resolve(process.cwd(), 'package.json')
  const verPath = path.resolve(process.cwd(), 'public', 'version.json')

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const ver = JSON.parse(fs.readFileSync(verPath, 'utf-8'))

  it('should have matching versions between package.json and public/version.json', () => {
    assert.strictEqual(
      ver.version,
      pkg.version,
      `version.json (${ver.version}) must match package.json (${pkg.version})`
    )
  })

  it('should have valid semver format', () => {
    const semverRegex = /^\d+\.\d+\.\d+$/
    assert.match(pkg.version, semverRegex, 'Package version must follow semver X.Y.Z')
    assert.match(ver.version, semverRegex, 'version.json must follow semver X.Y.Z')
  })
})
