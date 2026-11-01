import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

function getFiles(dir, exts = ['.jsx', '.js'], fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      getFiles(fullPath, exts, fileList)
    } else if (exts.some((ext) => file.endsWith(ext))) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

describe('Constitution File Invariants (Max 500 lines per file)', () => {
  const srcDir = path.resolve(process.cwd(), 'src')
  const srcFiles = getFiles(srcDir)

  it('should find source files to audit', () => {
    assert.ok(srcFiles.length > 0)
  })

  srcFiles.forEach((filePath) => {
    const relPath = path.relative(process.cwd(), filePath)

    it(`should not exceed 500 lines: ${relPath}`, () => {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n').length
      assert.ok(
        lines <= 500,
        `File ${relPath} has ${lines} lines, exceeding the 500 lines hard limit!`
      )
    })
  })
})
