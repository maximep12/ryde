import { MESSAGE } from '@repo/constants'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { ContextVariables } from '../../../index'
import { zValidatorThrow } from '../../../lib/errors/zValidatorThrow'
import {
  createClientComment,
  deleteClientComment,
  getClientAssortments,
  getClientById,
  getClientComments,
  getClientExchanges,
  getClientOrders,
  getClients,
  getOrderById,
  getOrderItems,
  searchClients,
  updateClientComment,
} from './helpers'
import {
  clientQuerySchema,
  clientSearchSchema,
  createCommentSchema,
  updateCommentSchema,
} from './schemas'

const clientsRouter = new Hono<{ Variables: ContextVariables }>()

export const clientsRouterDefinition = clientsRouter

  // ============================================================================
  // CLIENTS ENDPOINTS
  // ============================================================================

  /**
   * GET /clients/search
   * Search clients with autocomplete (minimum 3 characters)
   * Returns max 10 results for performance
   */
  .get('/search', zValidatorThrow('query', clientSearchSchema), async (c) => {
    const query = c.req.valid('query')
    const results = await searchClients(query)
    return c.json(results)
  })

  /**
   * GET /clients
   * List all clients with pagination and filtering
   */
  .get('/', zValidatorThrow('query', clientQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getClients(query)
    return c.json(result)
  })

  /**
   * GET /clients/:id
   * Get a single client by ID with full profile data
   */
  .get(
    '/:id',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param')
      const client = await getClientById(id)

      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      return c.json(client)
    },
  )

  // ============================================================================
  // ORDERS ENDPOINTS
  // ============================================================================

  /**
   * GET /clients/:id/orders
   * Get recent orders for a client (default 11 orders)
   */
  .get(
    '/:id/orders',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    zValidatorThrow(
      'query',
      z.object({ limit: z.coerce.number().int().min(1).max(50).default(11) }),
    ),
    async (c) => {
      const { id } = c.req.valid('param')
      const { limit } = c.req.valid('query')

      const client = await getClientById(id)
      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      const orders = await getClientOrders(id, limit)
      return c.json(orders)
    },
  )

  /**
   * GET /clients/:id/orders/:orderId
   * Get order details including order items
   */
  .get(
    '/:id/orders/:orderId',
    zValidatorThrow(
      'param',
      z.object({
        id: z.coerce.number().int().positive(),
        orderId: z.coerce.number().int().positive(),
      }),
    ),
    async (c) => {
      const { id, orderId } = c.req.valid('param')

      const client = await getClientById(id)
      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      const order = await getOrderById(orderId)
      if (!order || order.clientId !== id) {
        throw new HTTPException(404, { message: MESSAGE.ORDER_NOT_FOUND })
      }

      const items = await getOrderItems(orderId)

      return c.json({ ...order, items })
    },
  )

  // ============================================================================
  // EXCHANGES ENDPOINTS
  // ============================================================================

  /**
   * GET /clients/:id/exchanges
   * Get exchange/return history for a client
   */
  .get(
    '/:id/exchanges',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param')

      const client = await getClientById(id)
      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      const exchanges = await getClientExchanges(id)
      return c.json(exchanges)
    },
  )

  // ============================================================================
  // ASSORTMENTS ENDPOINTS
  // ============================================================================

  /**
   * GET /clients/:id/assortments
   * Get product assortments/subscriptions for a client
   */
  .get(
    '/:id/assortments',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param')

      const client = await getClientById(id)
      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      const assortments = await getClientAssortments(id)
      return c.json(assortments)
    },
  )

  // ============================================================================
  // COMMENTS ENDPOINTS
  // ============================================================================

  /**
   * GET /clients/:id/comments
   * Get all comments/notes for a client
   */
  .get(
    '/:id/comments',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param')

      const client = await getClientById(id)
      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      const comments = await getClientComments(id)
      return c.json(comments)
    },
  )

  /**
   * POST /clients/:id/comments
   * Create a new comment/note for a client
   */
  .post(
    '/:id/comments',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    zValidatorThrow('json', createCommentSchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const { content } = c.req.valid('json')
      const { id: userId } = c.get('user')

      const client = await getClientById(id)
      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      const comment = await createClientComment(id, userId, content)
      return c.json({ message: MESSAGE.COMMENT_CREATED, comment }, 201)
    },
  )

  /**
   * PATCH /clients/:id/comments/:commentId
   * Update a comment (only the author can update)
   */
  .patch(
    '/:id/comments/:commentId',
    zValidatorThrow(
      'param',
      z.object({
        id: z.coerce.number().int().positive(),
        commentId: z.coerce.number().int().positive(),
      }),
    ),
    zValidatorThrow('json', updateCommentSchema),
    async (c) => {
      const { id, commentId } = c.req.valid('param')
      const { content } = c.req.valid('json')
      const { id: userId } = c.get('user')

      const client = await getClientById(id)
      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      const comment = await updateClientComment(commentId, userId, content)
      if (!comment) {
        throw new HTTPException(404, { message: MESSAGE.COMMENT_NOT_FOUND })
      }

      return c.json({ message: MESSAGE.COMMENT_UPDATED, comment })
    },
  )

  /**
   * DELETE /clients/:id/comments/:commentId
   * Delete a comment (only the author can delete)
   */
  .delete(
    '/:id/comments/:commentId',
    zValidatorThrow(
      'param',
      z.object({
        id: z.coerce.number().int().positive(),
        commentId: z.coerce.number().int().positive(),
      }),
    ),
    async (c) => {
      const { id, commentId } = c.req.valid('param')
      const { id: userId } = c.get('user')

      const client = await getClientById(id)
      if (!client) {
        throw new HTTPException(404, { message: MESSAGE.CLIENT_NOT_FOUND })
      }

      const deleted = await deleteClientComment(commentId, userId)
      if (!deleted) {
        throw new HTTPException(404, { message: MESSAGE.COMMENT_NOT_FOUND })
      }

      return c.json({ message: MESSAGE.COMMENT_DELETED })
    },
  )
