import { MESSAGE } from '@repo/constants'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { approveOrder, createOrder, findClientByCode, getOrderById, getOrders, parsePdfOrderForm } from './helpers'
import { createOrderSchema, ordersQuerySchema, parsedOrderFormSchema } from './schemas'

const ordersRouter = new Hono<{ Variables: ContextVariables }>()

export const ordersRouterDefinition = ordersRouter

  /**
   * GET /orders
   * List all orders with pagination and optional status filter
   */
  .get('/', zValidatorThrow('query', ordersQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getOrders(query)
    return c.json(result)
  })

  /**
   * GET /orders/:orderId
   * Get a single order by ID with items and client info
   */
  .get('/:orderId', async (c) => {
    const orderId = Number(c.req.param('orderId'))
    if (Number.isNaN(orderId)) {
      throw new HTTPException(400, { message: 'Invalid order ID' })
    }

    const order = await getOrderById(orderId)
    if (!order) {
      throw new HTTPException(404, { message: MESSAGE.ORDER_NOT_FOUND })
    }

    return c.json(order)
  })

  /**
   * POST /orders
   * Create a new order
   */
  .post('/', zValidatorThrow('json', createOrderSchema), async (c) => {
    const input = c.req.valid('json')

    try {
      const result = await createOrder(input)
      return c.json({ order: result }, 201)
    } catch (error) {
      if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
        throw new HTTPException(400, { message: MESSAGE.CLIENT_NOT_FOUND })
      }
      throw error
    }
  })

  /**
   * POST /orders/:orderId/approve
   * Approve an order that requires approval
   */
  .post('/:orderId/approve', async (c) => {
    const orderId = Number(c.req.param('orderId'))
    if (Number.isNaN(orderId)) {
      throw new HTTPException(400, { message: 'Invalid order ID' })
    }

    const user = c.get('user')
    if (!user) {
      throw new HTTPException(401, { message: MESSAGE.SESSION_NOT_FOUND })
    }

    try {
      const result = await approveOrder(orderId, user.id)
      return c.json({ success: true, approvedAt: result.approvedAt })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ORDER_NOT_FOUND') {
          throw new HTTPException(404, { message: MESSAGE.ORDER_NOT_FOUND })
        }
        if (error.message === 'ORDER_DOES_NOT_REQUIRE_APPROVAL') {
          throw new HTTPException(400, { message: 'This order does not require approval' })
        }
        if (error.message === 'ORDER_ALREADY_APPROVED') {
          throw new HTTPException(400, { message: 'This order has already been approved' })
        }
      }
      throw error
    }
  })

  /**
   * POST /orders/parse-pdf
   * Parse a PDF order form and return structured data
   * Accepts multipart/form-data with a 'file' field
   */
  .post('/parse-pdf', async (c) => {
    try {
      // Parse multipart form data
      const formData = await c.req.formData()
      const file = formData.get('file')

      // Validate file presence
      if (!file || !(file instanceof File)) {
        throw new HTTPException(400, { message: MESSAGE.PDF_FILE_REQUIRED })
      }

      // Parse the PDF
      const parsedData = await parsePdfOrderForm(file)

      // Optionally enrich with client lookup if we found a client code
      if (parsedData.soldToPartyCode) {
        const client = await findClientByCode(parsedData.soldToPartyCode)
        if (client) {
          // Enrich with verified client data
          parsedData._meta = {
            ...parsedData._meta!,
            clientVerified: true,
            clientId: client.id,
          }
        }
      }

      // Validate the parsed data against schema
      const validated = parsedOrderFormSchema.safeParse(parsedData)
      if (!validated.success) {
        // Still return data but with lower confidence
        parsedData._meta = {
          ...parsedData._meta!,
          confidence: Math.min(parsedData._meta?.confidence ?? 0, 0.5),
          warnings: [...(parsedData._meta?.warnings ?? []), 'Some parsed fields did not match expected format'],
        }
      }

      return c.json(parsedData)
    } catch (error) {
      if (error instanceof HTTPException) throw error

      const message = error instanceof Error ? error.message : 'PDF_PARSE_FAILED'

      // Map known error codes
      const errorMessages: Record<string, string> = {
        PDF_FILE_TOO_LARGE: MESSAGE.PDF_FILE_TOO_LARGE,
        PDF_INVALID_FILE_TYPE: MESSAGE.PDF_INVALID_FILE_TYPE,
        PDF_NO_TEXT_CONTENT: MESSAGE.PDF_NO_TEXT_CONTENT,
      }

      throw new HTTPException(400, {
        message: errorMessages[message] || MESSAGE.PDF_PARSE_FAILED,
      })
    }
  })
