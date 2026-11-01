import fs from 'node:fs'
import path from 'node:path'

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full))
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(full)
    }
  }
  return results
}

const files = walk(path.resolve(process.cwd(), 'src'))
const over500 = []
const withComments = []
const withConfirm = []

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8')
  const lines = content.split('\n').length
  if (lines > 500) {
    over500.push({ file: path.relative(process.cwd(), f), lines })
  }

  const codeNoStr = content
    .replace(/"(?:[^"\\]|\\.)*"/g, '')
    .replace(/'(?:[^'\\]|\\.)*'/g, '')
    .replace(/`(?:[^`\\]|\\.)*`/g, '')

  if (/\/\/|\/\*/.test(codeNoStr)) {
    withComments.push(path.relative(process.cwd(), f))
  }

  if (/window\.confirm|alert\(/.test(codeNoStr)) {
    withConfirm.push(path.relative(process.cwd(), f))
  }
}

console.log('TOTAL_FILES_SCANNED:', files.length)
console.log('OVER_500_LINES:', JSON.stringify(over500, null, 2))
console.log('WITH_COMMENTS:', JSON.stringify(withComments, null, 2))
console.log('WITH_CONFIRM_OR_ALERT:', JSON.stringify(withConfirm, null, 2))
