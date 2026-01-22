import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import { createBaseLogger } from '@repo/logger'
import { getQueue, QUEUE_AWS_SQS_FILE_UPLOADS } from '@repo/queue'
import { z } from 'zod'
import { env } from './env'
import { connection } from './redis'

const sqs = new SQSClient({
  region: env.AWS_FILE_UPLOAD_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: env.AWS_FILE_UPLOAD_IAM_USER_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_FILE_UPLOAD_IAM_USER_SECRET_ACCESS_KEY_ID,
  },
})

const QUEUE_URL = env.AWS_FILE_UPLOADS_SQS_QUEUE_URL

let shouldStop = false
let isPolling = false

const SQSMessageRecordSchema = z.object({
  eventVersion: z.string(),
  eventSource: z.string(),
  awsRegion: z.string(),
  eventTime: z.string(),
  eventName: z.string(),
  userIdentity: z.object({
    principalId: z.string(),
  }),
  requestParameters: z.object({
    sourceIPAddress: z.string(),
  }),
  responseElements: z.object({
    'x-amz-request-id': z.string(),
    'x-amz-id-2': z.string(),
  }),
  s3: z
    .object({
      s3SchemaVersion: z.string(),
      configurationId: z.string(),
      bucket: z.object({
        name: z.string(),
        ownerIdentity: z.object({
          principalId: z.string(),
        }),
        arn: z.string(),
      }),
      object: z.object({
        key: z.string(),
        size: z.number(),
        eTag: z.string(),
        sequencer: z.string(),
      }),
    })
    .optional(),
})

const SQSMessageBodySchema = z.object({
  Records: z.array(SQSMessageRecordSchema),
})

type SQSMessageRecord = z.infer<typeof SQSMessageRecordSchema>

const logger = createBaseLogger().child({
  module: 'worker',
})

async function pollMessages() {
  logger.info('Starting SQS poller...')

  while (!shouldStop) {
    isPolling = true

    try {
      const receiveCommand = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 60,
      })

      const { Messages } = await sqs.send(receiveCommand)
      logger.info({ messages: Messages }, 'Received messages')

      if (Messages?.length) {
        for (const msg of Messages) {
          try {
            const body = JSON.parse(msg.Body!)
            const parsedBody = SQSMessageBodySchema.parse(body)
            logger.info(parsedBody, 'Processing')

            for (const record of parsedBody?.Records ?? []) {
              await handleMessageRecord(record)
            }

            await sqs.send(
              new DeleteMessageCommand({
                QueueUrl: QUEUE_URL,
                ReceiptHandle: msg.ReceiptHandle!,
              }),
            )
          } catch (err) {
            logger.error(err, 'Message failed')
            // No delete = message will reappear after visibility timeout
          }
        }
      }
    } catch (err) {
      logger.error(err, 'Polling error')
      await new Promise((res) => setTimeout(res, 5000)) // backoff
    } finally {
      isPolling = false
    }
  }
}

// Simulate work --> Will post a job to BullMQ
async function handleMessageRecord(record: SQSMessageRecord) {
  logger.info({ record }, 'handleMessage')
  logger.info({ s3: record?.s3 }, 's3')

  if (!record?.s3) {
    logger.error(record, 'No S3 data found in record while processing SQS message')
    return
  }

  const queue = getQueue(QUEUE_AWS_SQS_FILE_UPLOADS, connection)
  return queue.add('process-s3-upload-app-sqs', record)
}

// Setup graceful shutdown
function setupShutdownHooks() {
  const shutdown = () => {
    logger.info('\n🔻 Graceful shutdown initiated...')
    shouldStop = true

    const check = setInterval(() => {
      if (!isPolling) {
        logger.info('✅ All in-flight polling complete. Exiting.')
        clearInterval(check)
        process.exit(0)
      }
    }, 500)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

export const startSQSPoller = () => {
  // Bootstrap
  setupShutdownHooks()
  pollMessages()
}
