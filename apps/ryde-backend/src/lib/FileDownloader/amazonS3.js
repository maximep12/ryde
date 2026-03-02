import fs from 'fs'
import first from 'lodash/first'

const { GetObjectCommand, S3Client, ListObjectsCommand } = require('@aws-sdk/client-s3')

export default class AmazonS3Client {
  constructor({ clientInfos }) {
    this.client = new S3Client(clientInfos)
  }

  async getAllFilesInContainer({ bucket }) {
    const listObjectsCommand = new ListObjectsCommand({ Bucket: bucket })

    const response = await this.client.send(listObjectsCommand)

    const availableFiles = response.Contents

    if (!availableFiles || availableFiles.length === 0) throw new Error(`No file in the selected bucket ${bucket.name}`)

    return availableFiles.map((file) => ({ name: file.Key, date: file.LastModified }))
  }

  async getLatestFileKey({ bucket }) {
    const listObjectsCommand = new ListObjectsCommand({ Bucket: bucket })

    const response = await this.client.send(listObjectsCommand)

    const availableFiles = response.Contents

    if (!availableFiles || availableFiles.length === 0) throw new Error(`No file in the selected bucket ${bucket.name}`)

    return first(availableFiles?.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified)))?.Key
  }

  async getS3Content({ bucket, key }) {
    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key })
    const response = await this.client.send(getObjectCommand)

    const { Body } = response

    return Body
  }

  async downloadFile({ stream, fileName, path }) {
    const name = path.concat('/', fileName.replace(/\s/g, ''))

    await new Promise((resolve, reject) => {
      const fileDownloader = fs.createWriteStream(name)
      stream.pipe(fileDownloader)
      fileDownloader.on('finish', resolve)
      fileDownloader.on('error', reject)
    })

    return name
  }
}
