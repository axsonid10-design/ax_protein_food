import { describe, it, beforeAll, afterAll, beforeEach, afterEach, test as vitestTest } from 'vitest'

export function test(name, fn) {
  if (typeof fn === 'function' && fn.length > 0) {
    return describe(name, () => {
      const t = {
        test: (subName, subFn) => {
          return it(subName, subFn)
        }
      }
      const res = fn(t)
      // If it returned a promise, we don't need to await because describe is synchronous in vitest
    })
  }
  return vitestTest(name, fn)
}

test.describe = describe
test.it = it
test.test = test
test.before = beforeAll
test.after = afterAll
test.beforeEach = beforeEach
test.afterEach = afterEach

export default test
export { describe, it, beforeAll, afterAll, beforeEach, afterEach }
