import { Hono } from 'hono'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import {
  createReportComment,
  deleteReportComment,
  getReportComments,
  getReportDetail,
  getReportFilterOptions,
  getReports,
  updateReportComment,
  validateReport,
} from './helpers'
import {
  commentParamsSchema,
  createCommentSchema,
  reportDetailParamsSchema,
  reportsQuerySchema,
  updateCommentSchema,
} from './schemas'

const reportsRouter = new Hono<{ Variables: ContextVariables }>()

export const reportsRouterDefinition = reportsRouter

  /**
   * GET /reports
   * List all reports with pagination and optional filters
   */
  .get('/', zValidatorThrow('query', reportsQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getReports(query)
    return c.json(result)
  })

  /**
   * GET /reports/filter-options
   * Get available filter options for plant names
   */
  .get('/filter-options', async (c) => {
    const result = await getReportFilterOptions()
    return c.json(result)
  })

  /**
   * GET /reports/:plantName/:materialNumber
   * Get detailed report for a specific plant and material combination
   */
  .get(
    '/:plantName/:materialNumber',
    zValidatorThrow('param', reportDetailParamsSchema),
    async (c) => {
      const params = c.req.valid('param')
      const result = await getReportDetail(params.plantName, params.materialNumber)
      if (!result) {
        return c.json({ error: 'Report not found' }, 404)
      }
      return c.json(result)
    },
  )

  // ============================================================================
  // COMMENTS ENDPOINTS
  // ============================================================================

  /**
   * GET /reports/:plantName/:materialNumber/comments
   * Get all comments/notes for a report
   */
  .get(
    '/:plantName/:materialNumber/comments',
    zValidatorThrow('param', reportDetailParamsSchema),
    async (c) => {
      const { plantName, materialNumber } = c.req.valid('param')
      const comments = await getReportComments(plantName, materialNumber)
      return c.json(comments)
    },
  )

  /**
   * POST /reports/:plantName/:materialNumber/comments
   * Create a new comment/note for a report
   */
  .post(
    '/:plantName/:materialNumber/comments',
    zValidatorThrow('param', reportDetailParamsSchema),
    zValidatorThrow('json', createCommentSchema),
    async (c) => {
      const { plantName, materialNumber } = c.req.valid('param')
      const { content } = c.req.valid('json')
      const { id: userId } = c.get('user')

      const comment = await createReportComment(plantName, materialNumber, userId, content)
      return c.json({ message: 'Comment created', comment }, 201)
    },
  )

  /**
   * PATCH /reports/:plantName/:materialNumber/comments/:commentId
   * Update a comment (only the author can update)
   */
  .patch(
    '/:plantName/:materialNumber/comments/:commentId',
    zValidatorThrow('param', commentParamsSchema),
    zValidatorThrow('json', updateCommentSchema),
    async (c) => {
      const { commentId } = c.req.valid('param')
      const { content } = c.req.valid('json')
      const { id: userId } = c.get('user')

      const comment = await updateReportComment(commentId, userId, content)
      if (!comment) {
        return c.json({ error: 'Comment not found or you are not authorized to edit it' }, 404)
      }

      return c.json({ message: 'Comment updated', comment })
    },
  )

  /**
   * DELETE /reports/:plantName/:materialNumber/comments/:commentId
   * Delete a comment (only the author can delete)
   */
  .delete(
    '/:plantName/:materialNumber/comments/:commentId',
    zValidatorThrow('param', commentParamsSchema),
    async (c) => {
      const { commentId } = c.req.valid('param')
      const { id: userId } = c.get('user')

      const deleted = await deleteReportComment(commentId, userId)
      if (!deleted) {
        return c.json({ error: 'Comment not found or you are not authorized to delete it' }, 404)
      }

      return c.json({ message: 'Comment deleted' })
    },
  )

  // ============================================================================
  // VALIDATION ENDPOINTS
  // ============================================================================

  /**
   * POST /reports/:plantName/:materialNumber/validate
   * Validate a report (marks it as reviewed/verified by current user)
   */
  .post(
    '/:plantName/:materialNumber/validate',
    zValidatorThrow('param', reportDetailParamsSchema),
    async (c) => {
      const { plantName, materialNumber } = c.req.valid('param')
      const { id: userId } = c.get('user')

      const validation = await validateReport(plantName, materialNumber, userId)
      return c.json({
        message: 'Report validated',
        validatedAt: validation?.validatedAt,
      })
    },
  )
