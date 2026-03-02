import { BlobServiceClient } from '@azure/storage-blob'
import config from 'config'
import first from 'lodash/first'

export default class SFTP {
  constructor() {
    this.client = BlobServiceClient.fromConnectionString(config.sftpConnectionString)
  }

  async getAvailableContainers() {
    const containers = []
    for await (const container of this.client.listContainers()) {
      containers.push(container.name)
    }

    return containers
  }

  async getContainerBlobs({ containerName }) {
    const blobs = []
    const containerClient = this.client.getContainerClient(containerName)
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push(blob)
    }

    return blobs
  }

  async downloadBlob({ containerName, blobName }) {
    const containerClient = this.client.getContainerClient(containerName)
    const blobClient = containerClient.getBlobClient(blobName)

    const fileLocation = `temp/downloads/${containerName}/${blobName}`
    await blobClient.downloadToFile(fileLocation)

    return fileLocation
  }

  async getLatestBlob({ containerName }) {
    const availableBlobs = await this.getContainerBlobs({ containerName })
    const sortedBlobs = availableBlobs.sort(
      (a, b) => new Date(b.properties.createdOn) - new Date(a.properties.createdOn),
    )

    return first(sortedBlobs)
  }

  async getAllBlobs({ containerName }) {
    const availableBlobs = await this.getContainerBlobs({ containerName })
    return availableBlobs.map((blob) => ({ name: blob.name, date: blob.properties.createdOn }))
  }

  async downloadLatestBlob({ containerName }) {
    const latestBlob = await this.getLatestBlob({ containerName })

    const downloadLocation = await this.downloadBlob({ containerName, blobName: latestBlob.name })
    return downloadLocation
  }

  async getBlobContent({ containerName, blobName }) {
    const containerClient = this.client.getContainerClient(containerName)
    const blobClient = containerClient.getBlobClient(blobName)

    const content = await blobClient.download()

    const stream = content.readableStreamBody
    stream.setEncoding('utf8')
    let data = ''
    for await (const chunk of stream) {
      data += chunk
    }

    return data
  }
}
