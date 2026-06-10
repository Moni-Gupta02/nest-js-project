// src/utils/image-processing.utils.ts
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

@Injectable()
export class ImageProcessingUtils {
  // Get width/height from image buffer
  async getImageMetadata(imageBuffer: Buffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    } catch (err) {
      return { width: null, height: null, format: null };
    }
  }

  // Create compressed (jpeg) version
  async createCompressedImage(imageBuffer: Buffer) {
    return sharp(imageBuffer)
      .jpeg({ quality: 75 }) // Adjust quality as desired
      .toBuffer();
  }

  // Create a thumbnail with desired size and fit
  async createThumbnail(
    imageBuffer: Buffer,
    width: number,
    height: number,
    options: {
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      position?:
        | keyof sharp.Gravity
        | 'center'
        | 'top'
        | 'right'
        | 'left'
        | 'bottom'
        | 'entropy'
        | 'attention';
      quality?: number;
    } = {},
  ) {
    return sharp(imageBuffer)
      .resize(width, height, {
        fit: options.fit || 'cover',
        position: options.position || 'center',
      })
      .jpeg({ quality: options.quality || 80 })
      .toBuffer();
  }
}
