/* eslint-disable @typescript-eslint/no-explicit-any */
function chunkArray(array: Array<any>, size: number) {
  const result = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

export { chunkArray }
