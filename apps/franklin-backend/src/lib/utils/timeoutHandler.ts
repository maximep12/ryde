import { Context } from 'hono'

export const timeoutHandler = (timeoutMs: number = 5000) => {
  return async (c: Context) => {
    let timeoutId: NodeJS.Timeout | null = null

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, timeoutMs)
    })

    // Clean up timeout if client disconnects
    c.req.raw.signal.addEventListener(
      'abort',
      () => {
        if (timeoutId) clearTimeout(timeoutId)
      },
      { once: true },
    )

    try {
      await timeoutPromise
      if (timeoutId) clearTimeout(timeoutId)
      return c.json({ success: true })
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId)
      return c.json({ error: 'Request timed out' }, 504)
    } finally {
      // Ensure timeout is cleared in all cases
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
}
