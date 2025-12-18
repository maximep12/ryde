import { setupCleanupJobs } from '../../workers/cleanup/jobs'
import { setupPlaceholderJobs } from '../../workers/placeholder/jobs'

export const startPollingServices = () => {
  // Setup recurring jobs
  setupCleanupJobs()
  setupPlaceholderJobs()
}
