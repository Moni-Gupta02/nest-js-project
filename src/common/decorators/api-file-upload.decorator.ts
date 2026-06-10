import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export function ApiFileUpload() {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description:
        'Upload multiple images with processing options and multiple thumbnail sizes',
      schema: {
        type: 'object',
        properties: {
          model_name: {
            type: 'string',
            description: 'Model name for file organization',
            example: 'ProductImages',
          },
          generateThumbnail: {
            type: 'boolean',
            description: 'Generate thumbnails',
            example: false,
            default: false,
          },
          compressionQuality: {
            type: 'integer',
            description: 'Compression quality (10-100)',
            example: 80,
            minimum: 10,
            maximum: 100,
          },
          // REMOVED: thumbnailSize (backward compatibility removed)
          thumbnailPresets: {
            type: 'string',
            description: 'Comma-separated predefined thumbnail sizes',
            example:
              'thumbnail_100_100,thumbnail_200_200,thumbnail_400_400,thumbnail_350_400,thumbnail_220_200,thumbnail_500_500',
          },
          thumbnailFit: {
            type: 'string',
            description: 'How to fit all thumbnails in their dimensions',
            enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
            example: 'contain',
            default: 'contain',
          },
          thumbnailPosition: {
            type: 'string',
            description: 'Position for cover mode (applied to all thumbnails)',
            enum: [
              'center',
              'top',
              'bottom',
              'left',
              'right',
              'left top',
              'right top',
              'left bottom',
              'right bottom',
            ],
            example: 'center',
            default: 'center',
          },
          thumbnailQuality: {
            type: 'integer',
            description: 'Quality for all thumbnails (10-100)',
            example: 85,
            minimum: 10,
            maximum: 100,
          },
          files: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
            description: 'Image files (JPEG, PNG, WebP)',
          },
        },
        required: ['model_name', 'files'],
      },
    }),
  );
}
