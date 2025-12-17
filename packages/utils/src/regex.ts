/**
 * Tests if a string is a valid numeric input (including decimals and negative numbers)
 * Allows: empty string, optional minus sign, optional digits, optional decimal point, optional digits
 * @example
 * isValidNumericInput('') // true
 * isValidNumericInput('123') // true
 * isValidNumericInput('-123.45') // true
 * isValidNumericInput('12.') // true
 * isValidNumericInput('.45') // true
 * isValidNumericInput('abc') // false
 */
export const isValidNumericInput = (value: string): boolean => {
  return value === '' || /^-?\d*\.?\d*$/.test(value)
}
