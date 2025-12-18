import { Hono } from 'hono'
import { ContextVariables } from '../../index'
import { booksRouterDefinition } from './books/handlers'
import { clientsRouterDefinition } from './clients/handlers'

const exampleRouter = new Hono<{ Variables: ContextVariables }>()

export const exampleRouterDefinition = exampleRouter
  .route('/books', booksRouterDefinition)
  .route('/clients', clientsRouterDefinition)
