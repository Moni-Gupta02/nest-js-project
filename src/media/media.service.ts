import { Injectable } from '@nestjs/common';
import { CreateMediaDto, UpdateMediaDto } from './dto/create-media.dto';
import {
  deleteUploadedMedia,
  uploadMultipleFiles,
  uploadSingleFile,
} from 'src/common/utils/awsServices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MediaImageDocument } from './Schemas/media.schema';
import { ImageProcessingUtils } from 'src/common/utils/image-processing.utils';
import { S3Utils } from 'src/common/utils/s3.utils';

@Injectable()
export class MediaService {
  constructor(
    private readonly s3Utils: S3Utils,
    private readonly imageProcessingUtils: ImageProcessingUtils,
    @InjectModel('Media')
    private readonly mediaModel: Model<MediaImageDocument>,
  ) {}
  // async uploadImages(createMediaDto: CreateMediaDto, files: any) {
  //   // const files =
  //   //   file.length > 0
  //   //     ? await uploadMultipleFiles('user_id_1', createMediaDto, file)
  //   //     : [];
  //   // console.log(files, '<<<<--files');
  //   // const urls = [];
  //   // files.map(async (file) => {
  //   //   const url = `${createMediaDto.model_name}/${file.file_name}`;
  //   //   urls.push(url);
  //   //   await this.mediaModel.create({
  //   //     model_name: createMediaDto.model_name,
  //   //     user_id: 'user_id_1',
  //   //     media_size: file.size,
  //   //     file_name: file.file_name,
  //   //     url: url,
  //   //   });
  //   // });
  //   // return urls;
  //   // console.log('file upload==>', files);

  //   const MAX_FILE_SIZE = 1 * 1024 * 1024 * 100; // 100 MB
  //   const largeFiles = files.filter((file) => file.size > MAX_FILE_SIZE);
  //   const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE);

  //   const uploadedFiles =
  //     validFiles.length > 0
  //       ? await uploadMultipleFiles(createMediaDto, validFiles)
  //       : [];

  //   console.log(uploadedFiles, '<<<<--files');
  //   const urls = [];
  //   uploadedFiles.forEach(
  //     async (file: { file_name: any; size: any; file_type: any; url: any }) => {
  //       const url = `${process.env.BUCKET_FOLDER_NAME}/${createMediaDto.model_name}/${file.url}`;
  //       urls.push(url);
  //       await this.mediaModel.create({
  //         model_name: createMediaDto.model_name,
  //         media_size: file.size,
  //         file_name: file.file_name,
  //         url,
  //         file_type: file?.file_type,
  //       });
  //     },
  //   );

  //   // Returning both urls and information about the files that were too large
  //   return {
  //     uploadedUrls: urls,
  //     largeFiles: largeFiles.map((file) => file.name),
  //   };
  // }
  async uploadImages(createMediaDto: CreateMediaDto, files: any) {
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE);
    const largeFiles = files.filter((file) => file.size > MAX_FILE_SIZE);

    const urls = [];

    for (const file of validFiles) {
      // Save Original
      const baseUrl = `${process.env.BUCKET_FOLDER_NAME}/${createMediaDto.model_name}`;
      const sanitizedOriginalName = file.originalname.replace(/\s+/g, '_');
      const originalFileName = `${Date.now()}_${sanitizedOriginalName}`;

      await this.s3Utils.uploadProcessedImage(
        createMediaDto.model_name,
        originalFileName,
        file.buffer,
        file.mimetype,
      );

      const originalUrl = `${baseUrl}/${originalFileName}`;
      await this.mediaModel.create({
        model_name: createMediaDto.model_name,
        media_size: file.size,
        file_name: originalFileName,
        url: originalUrl,
        file_type: file.mimetype,
        variant_type: 'original',
        parent_file_id: null,
      });
      urls.push(originalUrl);

      // ---- Process Compressed Version ----
      const compressedBuffer =
        await this.imageProcessingUtils.createCompressedImage(file.buffer);
      const compressedFileName = originalFileName; // Optionally: prepend 'compressed_'
      const compressedFolder = `${createMediaDto.model_name}/compressed`;

      await this.s3Utils.uploadProcessedImage(
        compressedFolder,
        compressedFileName,
        compressedBuffer,
        'image/jpeg',
      );
      const compressedUrl = `${baseUrl}/compressed/${compressedFileName}`;
      await this.mediaModel.create({
        model_name: createMediaDto.model_name,
        media_size: compressedBuffer.length,
        file_name: `compressed_${originalFileName}`,
        url: compressedUrl,
        file_type: 'image/jpeg',
        variant_type: 'compressed',
        parent_file_id: null,
      });
      // urls.push(compressedUrl);

      // ---- Thumbnails ----
      const thumbnailSizes = [
        { width: 100, height: 100, name: 'thumbnail_100_100' },
        { width: 150, height: 150, name: 'thumbnail_150_150' },
        { width: 200, height: 200, name: 'thumbnail_200_200' },
        { width: 220, height: 200, name: 'thumbnail_220_200' },
        { width: 300, height: 100, name: 'thumbnail_300_100' },
        { width: 350, height: 400, name: 'thumbnail_350_400' },
        { width: 400, height: 400, name: 'thumbnail_400_400' },
        { width: 500, height: 500, name: 'thumbnail_500_500' },
      ];

      for (const thumb of thumbnailSizes) {
        const thumbnailBuffer = await this.imageProcessingUtils.createThumbnail(
          file.buffer,
          thumb.width,
          thumb.height,
          { fit: 'cover', position: 'center', quality: 85 },
        );

        const thumbnailFolder = `${createMediaDto.model_name}/thumbnails/${thumb.name}`;
        await this.s3Utils.uploadProcessedImage(
          thumbnailFolder,
          originalFileName,
          thumbnailBuffer,
          'image/jpeg',
        );

        const thumbnailUrl = `${baseUrl}/thumbnails/${thumb.name}/${originalFileName}`;
        await this.mediaModel.create({
          model_name: createMediaDto.model_name,
          media_size: thumbnailBuffer.length,
          file_name: `${thumb.name}_${originalFileName}`,
          url: thumbnailUrl,
          file_type: 'image/jpeg',
          variant_type: 'thumbnail',
          variant_subtype: thumb.name,
          parent_file_id: null,
        });
        // urls.push(thumbnailUrl);
      }
    }

    return {
      uploadedUrls: urls,
      largeFiles: largeFiles.map((file) => file.originalname),
    };
  }

  async findAll(modelName: string) {
    const filter =
      modelName === 'all'
        ? {}
        : modelName === 'dishes'
          ? {
              model_name: 'dishes',
              variant_type: { $nin: ['thumbnail', 'compressed'] },
            }
          : { model_name: modelName };

    const mediaList = await this.mediaModel
      .find(filter)
      .select('url file_name model_name file_type');
    return mediaList;
  }

  async removeImage(file_name: string, model_name: string) {
    await deleteUploadedMedia(file_name, model_name);
    const deleteImage = await this.mediaModel.deleteOne({
      file_name: file_name,
      model_name: model_name,
    });
    return deleteImage;
  }

  async updateImage(id: string, updateMediaDto: UpdateMediaDto, file: any) {
    const mediaDetails = await this.mediaModel.findById(id);

    if (!mediaDetails) {
      return {
        message: 'Image not found.',
        data: null,
        status: false,
      };
    }
    if (!file) {
      const updatedMedia = await this.mediaModel.findByIdAndUpdate(
        id,
        updateMediaDto,
        {
          new: true,
        },
      );
      return {
        message: 'Image metadata updated successfully.',
        data: updatedMedia,
        status: true,
      };
    }

    const result = await this.uploadSingleFile(updateMediaDto, file);

    const updatedData = {
      ...updateMediaDto,
      url: result.uploadedUrl,
      media_size: file.size,
      file_name: updateMediaDto.file_name || file.originalname,
      file_type: file?.mimetype,
    };

    const updatedMedia = await this.mediaModel.findByIdAndUpdate(
      id,
      updatedData,
      {
        new: true,
      },
    );

    return {
      message: 'Image and metadata updated successfully.',
      data: updatedMedia,
      status: true,
    };
  }

  async uploadSingleFile(createMediaDto: UpdateMediaDto, file: any) {
    const uploadedFile = await uploadSingleFile(createMediaDto, file);
    const url = `${process.env.BUCKET_FOLDER_NAME}/${createMediaDto.model_name}/${uploadedFile.url}`;

    return { uploadedUrl: url };
  }
}
