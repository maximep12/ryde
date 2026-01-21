import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { z, ZodSchema } from 'zod'

type UseSSEParams<T extends ZodSchema> = {
  url: string | null
  queryTokenKey?: string
  queryToken?: string
  zodSchema?: T
}

const ssePayloadSchema = z.discriminatedUnion('done', [
  z.object({ done: z.literal(true) }),
  z.object({ done: z.literal(false), data: z.any() }),
])

export const useSSE = <T extends ZodSchema>({
  url,
  queryTokenKey = 'sessionToken',
  queryToken,
  zodSchema,
}: UseSSEParams<T>) => {
  const [data, setData] = useState<z.infer<T>[]>([])
  const [error, setError] = useState<unknown>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const queryClient = useQueryClient()
  const verifiedSession = queryClient.getQueryData<{ sessionToken: string }>(['verifiedSession'])
  const sessionToken = verifiedSession?.sessionToken

  const authToken = useMemo(() => queryToken ?? sessionToken ?? '', [queryToken, sessionToken])

  const closeSSE = () => {
    console.log('Closing SSE connection')

    eventSourceRef.current?.close()
    eventSourceRef.current = null
  }

  useEffect(() => {
    if (!url) return
    setData([])

    const urlWithParams = new URL(url)
    if (authToken) urlWithParams.searchParams.append(queryTokenKey, authToken)

    console.log('Connecting to SSE:', urlWithParams.toString())

    eventSourceRef.current = new EventSource(urlWithParams.toString())

    eventSourceRef.current.onopen = () => {
      console.log('SSE connection opened successfully')
    }

    eventSourceRef.current.onmessage = (event) => {
      console.log('SSE message received:', event.data)
      try {
        const jsonParsedData = JSON.parse(event.data)
        const ssePayload = ssePayloadSchema.parse(jsonParsedData)

        if (ssePayload.done) {
          closeSSE()
        } else {
          console.log('SSE Payload Data:', ssePayload.data)
          // const intermediateSchema = z
          //   .array(zodSchema || z.any())
          //   .catch([])
          //   .transform((arr) => arr.filter(Boolean))

          // const parsedData = intermediateSchema.safeParse(ssePayload.data)
          // console.log('Parsed data with intermediate schema:', parsedData)
          // if (parsedData.success) {
          if (ssePayload.data) {
            // console.log('Parsed data:', parsedData.data)
            // setData((prev) => [...prev, ...parsedData.data])
            setData((prev) => [...prev, ...ssePayload.data])
          } else {
            console.error('Failed to parse SSE data:', jsonParsedData)
          }
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error)
        setError(error)
      }
    }

    eventSourceRef.current.onerror = (event) => {
      console.error('SSE Error:', event)
      setError(event)
      closeSSE()
    }

    return () => {
      closeSSE()
    }
  }, [url, authToken, queryTokenKey, zodSchema]) // Ensure correct dependency management

  return { data, error }
}
