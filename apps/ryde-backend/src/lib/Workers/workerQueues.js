import Queue from 'bull'
import config from 'config'
import Redis from 'ioredis'

export const flushRedis = async () => {
  const redis = new Redis(config.redisUrl)
  return redis.flushall().then(() => redis.disconnect())
}

function handleStalled(job) {
  console.log('Job stalled: ', job.id, job.name)
}

function handleFailed(job, err) {
  console.log('Job failed: ', job.name, job.id)
  const attemptsRemaining = job.opts.attempts - job.attemptsMade
  attemptsRemaining > 0
    ? console.log(`Attempts remaining: ${attemptsRemaining}. Trying ${job.name} again...`)
    : console.log(`ERROR: ${err.message}`)
}

function handleError(err) {
  console.log('Job error')
  console.log(err)
}

export const automationImports = new Queue('automationImports', config.redisUrl, {
  settings: { lockDuration: 600000, lockRenewTime: 100000 },
})

automationImports.on('stalled', handleStalled)
automationImports.on('failed', handleFailed)
automationImports.on('error', handleError)
