export function toFixedWithoutZeros(num: number, precision: number) {
  return Number.parseFloat(num.toFixed(precision))
}
