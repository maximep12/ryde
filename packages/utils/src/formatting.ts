export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

export const formatNumber = (number: number, locale: string = 'en-US') =>
  new Intl.NumberFormat(locale).format(number)

export const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
}

type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
  : S

export const snakeToCamel = <S extends string>(snake: S): SnakeToCamel<S> => {
  return snake.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) as SnakeToCamel<S>
}

export const snakeToCamelMap = <const T extends readonly string[]>(
  headers: T,
): Record<T[number], SnakeToCamel<T[number]>> => {
  return headers.reduce(
    (map, snake_case) => {
      const camelCase = snakeToCamel(snake_case)
      map[snake_case as T[number]] = camelCase as SnakeToCamel<T[number]>

      return map
    },
    {} as Record<T[number], SnakeToCamel<T[number]>>,
  )
}

export const toCamelCase = (str: string) => {
  return str
    .split(' ')
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')
}
