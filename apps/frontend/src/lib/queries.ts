export type QueryHandlers = {
  handleOnSuccess?: () => void
  handleOnError?: () => void
}

export const fetchWithThrow = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const res = await fetch(input, { ...init, credentials: 'include' })
  if (!res.ok) {
    const contentType = res.headers.get('Content-Type')

    if (contentType && contentType.includes('application/json')) {
      const json = await res.json()
      throw json
    }

    throw res
  }

  return res
}

export const stringifyValues = <T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]?: string | undefined } =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (value != null && typeof value === 'object') {
        try {
          return [key, JSON.stringify(value)]
        } catch {
          return [key, undefined]
        }
      }
      return [key, value != null ? String(value) : undefined]
    }),
  ) as { [K in keyof T]?: string | undefined }
