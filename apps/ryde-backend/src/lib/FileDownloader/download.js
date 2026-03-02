import config from 'config'
import AmazonS3Client, { downloadFile } from './amazonS3'

export async function downloadLatestS3File({ bucket, path }) {
  const clientInfos = {
    region: bucket.region,
    credentials: { accessKeyId: config.amazonS3.accessKeyId, secretAccessKey: config.amazonS3.secretAccessKey },
  }

  const s3Client = new AmazonS3Client({ clientInfos })

  const { latestKey } = await s3Client.getLatestFileKey({ bucket: bucket.name })
  const content = await s3Client.getS3Content({ key: latestKey, bucket: bucket.name })

  return await downloadFile({ stream: content, fileName: latestKey, path })
}
