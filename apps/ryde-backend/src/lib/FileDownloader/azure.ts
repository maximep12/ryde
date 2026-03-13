import { BlobServiceClient } from '@azure/storage-blob'

export type BlobInfo = {
  name: string
  date: Date
}

export class AzureBlobClient {
  private client: BlobServiceClient

  constructor(connectionString: string) {
    this.client = BlobServiceClient.fromConnectionString(connectionString)
  }

  async getAvailableContainers(): Promise<string[]> {
    const containers: string[] = []
    for await (const container of this.client.listContainers()) {
      containers.push(container.name)
    }
    return containers
  }

  async getContainerBlobs({ containerName }: { containerName: string }) {
    const blobs: { name: string; properties: { createdOn?: Date } }[] = []
    const containerClient = this.client.getContainerClient(containerName)
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push(blob)
    }
    return blobs
  }

  async downloadBlob({ containerName, blobName }: { containerName: string; blobName: string }): Promise<string> {
    const containerClient = this.client.getContainerClient(containerName)
    const blobClient = containerClient.getBlobClient(blobName)
    const fileLocation = `temp/downloads/${containerName}/${blobName}`
    await blobClient.downloadToFile(fileLocation)
    return fileLocation
  }

  async getLatestBlob({ containerName }: { containerName: string }) {
    const blobs = await this.getContainerBlobs({ containerName })
    const sorted = [...blobs].sort(
      (a, b) => (b.properties.createdOn?.getTime() ?? 0) - (a.properties.createdOn?.getTime() ?? 0),
    )
    const latest = sorted[0]
    if (!latest) throw new Error(`No blobs found in container ${containerName}`)
    return latest
  }

  async getAllBlobs({ containerName }: { containerName: string }): Promise<BlobInfo[]> {
    const blobs = await this.getContainerBlobs({ containerName })
    return blobs.map((blob) => ({ name: blob.name, date: blob.properties.createdOn ?? new Date() }))
  }

  async downloadLatestBlob({ containerName }: { containerName: string }): Promise<string> {
    const latest = await this.getLatestBlob({ containerName })
    return this.downloadBlob({ containerName, blobName: latest.name })
  }

  async getBlobContent({ containerName, blobName }: { containerName: string; blobName: string }): Promise<string> {
    const containerClient = this.client.getContainerClient(containerName)
    const blobClient = containerClient.getBlobClient(blobName)
    const download = await blobClient.download()
    const stream = download.readableStreamBody
    if (!stream) throw new Error('Empty blob stream')
    let data = ''
    for await (const chunk of stream) {
      data += chunk instanceof Buffer ? chunk.toString('utf8') : String(chunk)
    }
    return data
  }
}
