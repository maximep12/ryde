import { importLatestRabbaData } from '../banners/controller'

export async function runRabbaWorker(ctx) {
  try {
    const { container } = ctx.params
    await importLatestRabbaData({ containerName: container })
    ctx.body = { success: true }
  } catch (error) {
    ctx.throw(400, error.message)
  }
}
