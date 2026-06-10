// src/utils/s3.utils.ts
import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Utils {
  private readonly s3: AWS.S3;
  private readonly BUCKET_NAME = process.env.BUCKET_NAME;
  private readonly BUCKET_FOLDER_NAME = process.env.BUCKET_FOLDER_NAME;

  constructor() {
    AWS.config.update({
      accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
      secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
      region: process.env.BUCKET_REGION,
    });
    this.s3 = new AWS.S3();
  }

  async uploadProcessedImage(
    folderPath: string,
    fileName: string,
    buffer: Buffer,
    contentType: string,
  ) {
    const finalKey = `${this.BUCKET_FOLDER_NAME}/${folderPath}/${fileName}`;
    const params = {
      Bucket: this.BUCKET_NAME,
      Key: finalKey,
      Body: buffer,
      ContentType: contentType,
      ACL: 'bucket-owner-full-control',
    };
    return this.s3.upload(params).promise();
  }
}
