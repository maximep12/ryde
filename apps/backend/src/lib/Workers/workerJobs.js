import config from 'config'
import { importLatestRabbaData } from 'modules/banners/controller'
import { automationImports, flushRedis } from './workerQueues'
import { syncCustomersLocation } from 'modules/customers/controller'

flushRedis().then(async () => {
  // Add function to call here with concurrency = 1
  await automationImportsRabbaSellout(1)
  await automationAdvanceCustomerSync(0)
})

async function automationImportsRabbaSellout(concurrency) {
  automationImports.process('Get latest Rabba Sell-out file', concurrency, async (job) => {
    const containerName = config.rabbaContainer
    await importLatestRabbaData({ containerName })
  })

  await automationImports.add('Get latest Rabba Sell-out file', null, {
    attempts: 2,
    repeat: { tz: 'America/Toronto', cron: '*/15 * * * *' },
  })
  // Every 15 minutes
}

async function automationAdvanceCustomerSync(concurrency) {
  automationImports.process('Sync customers location from Advance', concurrency, async (job) => {
    await syncCustomersLocation()
  })

  await automationImports.add('Sync customers location from Advance', null, {
    attempts: 2,
    repeat: { tz: 'America/Toronto', cron: '0 6 * * *' },
  })
  // Every day at 6AM
}
