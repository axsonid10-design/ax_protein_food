import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const HOOKS = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useAXStore', 'useBodyScrollLock']

function getAllJsxFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      getAllJsxFiles(fullPath, fileList)
    } else if (file.endsWith('.jsx')) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

describe('React Hooks Integrity Scanner (No Early Return Before Hooks & Proper Imports)', () => {
  const componentsDir = path.resolve(process.cwd(), 'src', 'components')
  const jsxFiles = getAllJsxFiles(componentsDir)

  it('should find JSX files to scan', () => {
    assert.ok(jsxFiles.length > 0, 'Should find components')
  })

  jsxFiles.forEach((filePath) => {
    const relPath = path.relative(process.cwd(), filePath)

    it(`should not violate hooks order or import integrity in: ${relPath}`, () => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      let firstEarlyReturnLine = -1
      let earlyReturnSnippet = ''
      const hookCalls = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (
          firstEarlyReturnLine === -1 &&
          (line.startsWith('if (!isOpen) return null') ||
            line.startsWith('if (!isOpen ||') ||
            line.startsWith('if (!open) return null') ||
            line.startsWith('if (!isMounted) return null') ||
            line === 'if (!isOpen) return null;')
        ) {
          firstEarlyReturnLine = i + 1
          earlyReturnSnippet = line
        }

        for (const hook of HOOKS) {
          if (line.includes(`${hook}(`)) {
            hookCalls.push({ hook, line: i + 1, text: line })
          }
        }
      }

      const reactHooks = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef']
      for (const rh of reactHooks) {
        if (hookCalls.some((h) => h.hook === rh)) {
          const importMatch = new RegExp(`import\\s+[^;]*\\b${rh}\\b[^;]*from\\s+['"]react['"]`).test(content)
          assert.ok(importMatch, `[CRITICAL] React Hook "${rh}" called in ${relPath} but not imported from 'react'!`)
        }
      }

      if (firstEarlyReturnLine !== -1) {
        const illegalHooks = hookCalls.filter((h) => h.line > firstEarlyReturnLine)
        if (illegalHooks.length > 0) {
          const violationDetails = illegalHooks
            .map((h) => `Hook "${h.hook}" called at line ${h.line} AFTER early return at line ${firstEarlyReturnLine}`)
            .join('; ')
          assert.fail(`[CRITICAL] React Hook Order Violation in ${relPath}: ${violationDetails}`)
        }
      }
      assert.ok(true)
    })
  })
})
