import { plants } from '@repo/db'
import { db } from '../../db'
import { Hono } from 'hono'
import { ContextVariables } from '../..'

const router = new Hono<{ Variables: ContextVariables }>()

export const plantsRouterDefinition = router.get('/', async (c) => {
  const allPlants = await db.select().from(plants)
  return c.json({ items: allPlants })
})
