import type { Readable } from 'node:stream'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import type { Config } from '../config.ts'
import { assertKey, type Storage } from './storage.ts'

/** S3-compatible storage. Loaded only when STORAGE_DRIVER=s3, because the AWS SDK is large. */
export class S3Storage implements Storage {
  private client: S3Client
  private bucket: string

  constructor(cfg: Extract<Config['storage'], { driver: 's3' }>) {
    this.bucket = cfg.bucket
    this.client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    })
  }

  async put(key: string, body: Buffer, contentType: string) {
    assertKey(key)
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }))
  }

  async get(key: string) {
    assertKey(key)
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null
    } catch (err) {
      if (err instanceof NoSuchKey || err instanceof NotFound) return null
      throw err
    }
  }

  async stream(key: string) {
    assertKey(key)
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      // In Node.js the SDK returns the body as a Readable stream.
      return res.Body ? { body: res.Body as Readable, size: res.ContentLength ?? 0 } : null
    } catch (err) {
      if (err instanceof NoSuchKey || err instanceof NotFound) return null
      throw err
    }
  }

  async size(key: string) {
    assertKey(key)
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return res.ContentLength ?? 0
    } catch (err) {
      if (err instanceof NotFound || (err as { name?: string }).name === 'NotFound') return null
      throw err
    }
  }

  async delete(key: string) {
    assertKey(key)
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async list(prefix: string) {
    const keys: string[] = []
    let token: string | undefined
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      )
      for (const obj of res.Contents ?? []) if (obj.Key) keys.push(obj.Key)
      token = res.IsTruncated ? res.NextContinuationToken : undefined
    } while (token)
    return keys.sort()
  }

  describe() {
    return `S3-bucket ${this.bucket}`
  }
}
