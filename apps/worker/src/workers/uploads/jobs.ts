import { getQueue, QUEUE_S3_FILE_PROCESS_PRODUCTS } from '@repo/queue'
import { connection } from '../../redis'

export const jobsConfig = {
  PROCESS_S3_FILE_PRODUCTS: {
    jobName: 'Process S3 File Products',
  },
  PROCESS_S3_FILE_CLIENTS: {
    jobName: 'Process S3 File Clients',
  },
} satisfies Record<string, { jobName: string }>

export function setupS3FileProcessExampleModule() {
  const queue = getQueue(QUEUE_S3_FILE_PROCESS_PRODUCTS, connection)

  // Object.entries(jobsConfig).forEach(([, { jobName, cronPattern }]) => {
  //   queue.add(jobName, {}, { repeat: { pattern: cronPattern } })
  // })

  return queue.name
}
