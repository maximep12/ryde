import { UploadsToS3 } from '@repo/db'
import { Job } from 'bullmq'

export type ProcessingJobData = { upload: UploadsToS3 }
export type ProcessingJob = Job<ProcessingJobData>





