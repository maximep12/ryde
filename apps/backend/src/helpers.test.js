import { expect, test } from 'vitest'
import { returnsTheSumOfArray } from './helpers'

test('adding values in array', () => {
  expect(returnsTheSumOfArray([1, 2, 3, 4])).toBe(10)
})
