import { Hono } from 'hono'
import { ContextVariables } from '../../index'
import { clientsRouterDefinition } from '../clients/handlers'
import { ordersRouterDefinition } from '../orders/handlers'
import { productsRouterDefinition } from '../products/handlers'
import { usersRouterDefinition } from '../users/handlers'

const exampleRouter = new Hono<{ Variables: ContextVariables }>()

export const exampleRouterDefinition = exampleRouter
  .route('/users', usersRouterDefinition)
  .route('/clients', clientsRouterDefinition)
  .route('/orders', ordersRouterDefinition)
  .route('/products', productsRouterDefinition)
