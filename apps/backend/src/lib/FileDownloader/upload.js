import config from 'config'

import { Upload } from '@aws-sdk/lib-storage'
import { S3Client } from '@aws-sdk/client-s3'
import { formatFileNameToS3 } from './helpers'

/**
 * @param {Object} file - The file to upload
 * @param {string} file.name - The file name to upload
 * @param {stream} file.content - The file content to upload
 */

export async function uploadFileToS3({ bucket, file }) {
  const s3FileName = formatFileNameToS3({ fileName: file.name })

  const params = {
    Bucket: bucket.name,
    Key: s3FileName,
    Body: file.content,
  }

  const clientInfos = {
    region: bucket.region,
    credentials: { accessKeyId: config.amazonS3.accessKeyId, secretAccessKey: config.amazonS3.secretAccessKey },
  }

  const client = new S3Client(clientInfos)

  const upload = new Upload({ client, params })

  await upload.done()
  console.log(`${s3FileName} saved successfully`)
  return s3FileName
}
