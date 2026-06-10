import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';
import * as fs from 'fs';
import {
  CreateMediaDto,
  ThumbnailConfigDto,
} from 'src/media/dto/create-media.dto';
import * as sharp from 'sharp';

dotenv.config();
// Predefined thumbnail presets - simplified (only dimensions and names)
export const THUMBNAIL_PRESETS = {
  thumbnail_100_100: { width: 100, height: 100, name: 'thumbnail_100_100' },
  thumbnail_200_200: { width: 200, height: 200, name: 'thumbnail_200_200' },
  thumbnail_400_400: { width: 400, height: 400, name: 'thumbnail_400_400' },
  thumbnail_150_150: { width: 150, height: 150, name: 'thumbnail_150_150' },
  thumbnail_300_100: { width: 300, height: 100, name: 'thumbnail_300_100' },
  thumbnail_350_400: { width: 350, height: 400, name: 'thumbnail_350_400' },
  thumbnail_220_200: { width: 220, height: 200, name: 'thumbnail_220_200' },
  thumbnail_500_500: { width: 500, height: 500, name: 'thumbnail_500_500' },
};
const {
  BUCKET_ACCESS_KEY_ID,
  BUCKET_SECRET_ACCESS_KEY,
  BUCKET_NAME,
  BUCKET_REGION,
  BUCKET_FOLDER_NAME,
}: any = process.env;

const date = moment(new Date()).format('DD-MM-YYYY');
const time = moment(new Date()).format('HH-mm-ss');
const uploadMultipleFiles = async (data: CreateMediaDto, files: any) => {
  try {
    console.log(data, '<<<< body dto');
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    AWS.config.update({
      accessKeyId: BUCKET_ACCESS_KEY_ID,
      secretAccessKey: BUCKET_SECRET_ACCESS_KEY,
      region: BUCKET_REGION,
    });
    const folderName = `${BUCKET_NAME}/${BUCKET_FOLDER_NAME}/${data.model_name}`;
    const awsS3 = new AWS.S3();
    const uploadFilesObj: any = [];

    for (const item of files) {
      console.log(item, '<<<< item');
      if (item.size > MAX_FILE_SIZE) {
        console.error(`File size exceeds the limit of 100 MB: ${item.name}`);
        continue; // Skip this file
      }
      const endUrl = item?.mimetype?.split('/');
      const fileName =
        `${date}_${time}_${uuidv4()}` + '.' + endUrl[endUrl?.length - 1];
      console.log(folderName, '-----folderName');

      const params = {
        Bucket: folderName,
        Key: fileName,
        Body: item.buffer,
        ContentType: item.mimetype,
        ACL: 'bucket-owner-full-control',
      };
      await awsS3
        .upload(params)
        .promise()
        .catch((error) => {
          console.error(error);
        });
      uploadFilesObj.push({
        size: item.size,
        folder_name: folderName,
        file_name: item?.originalname,
        url: fileName,
        file_type: item?.mimetype,
      });
    }
    return uploadFilesObj;
  } catch (error) {
    console.error(
      'ERROR: util || s3Upload || s3Upload() ',
      JSON.stringify(error),
    );
    throw error;
  }
};

const deleteUploadedMedia = async (filename: string, model_name: string) => {
  const folderName = `${BUCKET_NAME}/${BUCKET_FOLDER_NAME}/${model_name}`;
  const params = {
    Bucket: folderName,
    Key: filename,
  };
  console.log(params, '<params');
  try {
    const awsS3 = new AWS.S3({
      accessKeyId: BUCKET_ACCESS_KEY_ID,
      secretAccessKey: BUCKET_SECRET_ACCESS_KEY,
      region: BUCKET_REGION,
      signatureVersion: 'v4',
    });
    awsS3.deleteObject(params, (err) => {
      if (err) {
        console.error(err, err.stack);
      }
    });
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
const uploadPDF = async (filePath: string, key: string) => {
  const fileContent = fs.readFileSync(filePath);
  const folderName = `${BUCKET_NAME}/BUCKET_FOLDER_NAME/recipe-pdf`;
  AWS.config.update({
    accessKeyId: BUCKET_ACCESS_KEY_ID,
    secretAccessKey: BUCKET_SECRET_ACCESS_KEY,
    region: BUCKET_REGION,
  });
  const awsS3 = new AWS.S3();
  const params = {
    Bucket: folderName,
    Key: key,
    Body: fileContent,
    ContentType: 'application/zip',
  };

  await awsS3.upload(params).promise();
  return `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/RMS/recipe-pdf/${key}`;
};
const uploadSingleFile = async (data: any, file: any) => {
  try {
    AWS.config.update({
      accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
      secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
      region: process.env.BUCKET_REGION,
    });
    const folderName = `${BUCKET_NAME}/${BUCKET_FOLDER_NAME}/${data.model_name}`;

    const awsS3 = new AWS.S3();
    const endUrl = file?.mimetype?.split('/');
    const fileName =
      `${date}_${time}_${uuidv4()}` + '.' + endUrl[endUrl?.length - 1];
    // const fileName = `${date}_${time}_${uuidv4()}}.${file.mimetype.split('/')[1]}`;
    const params = {
      Bucket: folderName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'bucket-owner-full-control',
    };

    await awsS3.upload(params).promise();
    return { url: fileName };
  } catch (error) {
    throw new Error(
      `ERROR: util || s3Upload || s3Upload() ${JSON.stringify(error)}`,
    );
  }
};

// Updated buildThumbnailConfigs helper (removed backward compatibility)
const buildThumbnailConfigs = (data: CreateMediaDto): ThumbnailConfigDto[] => {
  const configs: ThumbnailConfigDto[] = [];

  // Add custom configurations
  if (data.thumbnailConfigs && data.thumbnailConfigs.length > 0) {
    configs.push(...data.thumbnailConfigs);
  }

  // Add preset configurations
  if (data.thumbnailPresets && data.thumbnailPresets.length > 0) {
    for (const presetName of data.thumbnailPresets) {
      if (THUMBNAIL_PRESETS[presetName]) {
        configs.push(THUMBNAIL_PRESETS[presetName]);
      }
    }
  }

  // REMOVED: Fallback to single thumbnail for backward compatibility
  // No default thumbnail creation if no configs specified

  console.log({ configs }, '<<configs');
  return configs;
};

// Updated uploadMultipleFilesWithVariants function
const uploadMultipleFilesWithVariants = async (
  data: CreateMediaDto,
  files: any,
) => {
  try {
    const MAX_FILE_SIZE = 100 * 1024 * 1024;

    AWS.config.update({
      accessKeyId: BUCKET_ACCESS_KEY_ID,
      secretAccessKey: BUCKET_SECRET_ACCESS_KEY,
      region: BUCKET_REGION,
    });

    const baseFolderName = `${BUCKET_NAME}/${BUCKET_FOLDER_NAME}/${data.model_name}`;
    const awsS3 = new AWS.S3();
    const uploadResults: any = [];
    const thumbnailNanoId = uuidv4().substring(0, 5);

    // Build thumbnail configurations
    const thumbnailConfigs = buildThumbnailConfigs(data);

    // Common thumbnail settings
    const commonThumbnailSettings = {
      fit: data.thumbnailFit || 'contain',
      background: data.thumbnailBackground || 'white',
      position: data.thumbnailPosition || 'center',
      quality: data.thumbnailQuality || 85,
    };

    const options = {
      compressionQuality: data.compressionQuality || 80,
      generateThumbnail: data.generateThumbnail === true, // Strict check
      thumbnailConfigs,
      commonThumbnailSettings,
    };

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        console.error(
          `File size exceeds the limit of 100 MB: ${file.originalname}`,
        );
        continue;
      }

      const isImage = file.mimetype.startsWith('image/');
      const fileExtension = file.mimetype.split('/')[1];
      const baseFileName = `${date}_${time}_${uuidv4()}`;

      const fileResult: any = {
        original: null,
        compressed: null,
        thumbnails: [],
      };

      try {
        let originalMetadata = null;
        if (isImage) {
          originalMetadata = await sharp(file.buffer).metadata();
        }

        // Upload original file
        const originalFileName = `${baseFileName}_${thumbnailNanoId}_original.${fileExtension}`;
        await uploadToS3(
          awsS3,
          `${baseFolderName}/original`,
          originalFileName,
          file.buffer,
          file.mimetype,
        );

        fileResult.original = {
          size: file.size,
          file_name: file.originalname,
          url: originalFileName,
          file_type: file.mimetype,
          dimensions: originalMetadata
            ? {
              width: originalMetadata.width,
              height: originalMetadata.height,
            }
            : null,
        };

        if (isImage && originalMetadata) {
          // Create compressed version
          const compressedBuffer = await sharp(file.buffer)
            .jpeg({ quality: options.compressionQuality })
            .toBuffer();

          const compressedFileName = `${baseFileName}_${thumbnailNanoId}_compressed.jpg`;
          await uploadToS3(
            awsS3,
            `${baseFolderName}/compressed`,
            compressedFileName,
            compressedBuffer,
            'image/jpeg',
          );

          fileResult.compressed = {
            size: compressedBuffer.length,
            file_name: `compressed_${file.originalname}`,
            url: compressedFileName,
            file_type: 'image/jpeg',
            dimensions: {
              width: originalMetadata.width,
              height: originalMetadata.height,
            },
          };

          // Create multiple thumbnails ONLY if generateThumbnail is true
          console.log('options.generateThumbnail', options.generateThumbnail);
          if (
            options.generateThumbnail === true &&
            options.thumbnailConfigs.length > 0
          ) {
            for (const config of options.thumbnailConfigs) {
              try {
                const thumbnailResult = await createThumbnail(
                  file.buffer,
                  config,
                  options.commonThumbnailSettings,
                  baseFileName,
                  file.originalname,
                  awsS3,
                  baseFolderName,
                );

                if (thumbnailResult) {
                  fileResult.thumbnails.push(thumbnailResult);
                }
              } catch (thumbError) {
                console.error(
                  `Error creating ${config.name} thumbnail:`,
                  thumbError,
                );
              }
            }
          }
        }

        uploadResults.push(fileResult);
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        if (fileResult.original) {
          uploadResults.push(fileResult);
        }
      }
    }

    return uploadResults;
  } catch (error) {
    console.error(
      'ERROR: uploadMultipleFilesWithVariants',
      JSON.stringify(error),
    );
    throw error;
  }
};

// Helper function to create individual thumbnail
const createThumbnail = async (
  imageBuffer: Buffer,
  config: ThumbnailConfigDto,
  commonSettings: any,
  baseFileName: string,
  originalFileName: string,
  awsS3: AWS.S3,
  baseFolderName: string,
) => {
  const resizeOptions: any = {
    fit: commonSettings.fit,
  };

  if (commonSettings.fit === 'cover') {
    resizeOptions.position = commonSettings.position;
  }

  if (commonSettings.fit === 'contain') {
    resizeOptions.background = commonSettings.background;
  }

  const thumbnailPipeline = sharp(imageBuffer)
    .resize(config.width, config.height, resizeOptions)
    .jpeg({ quality: commonSettings.quality });

  const thumbnailBuffer = await thumbnailPipeline.toBuffer();
  const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

  const thumbnailName = config.name || `${config.width}x${config.height}`;
  const subFolder = thumbnailName;
  const thumbnailNanoId = uuidv4().substring(0, 5);
  const thumbnailFileName = `${baseFileName}_${thumbnailName}_${thumbnailNanoId}.jpg`;

  // Upload to S3 in organized subfolders
  await uploadToS3(
    awsS3,
    `${baseFolderName}/thumbnails/${subFolder}`,
    thumbnailFileName,
    thumbnailBuffer,
    'image/jpeg',
  );

  return {
    size: thumbnailBuffer.length,
    file_name: `${thumbnailName}_${originalFileName}`,
    url: thumbnailFileName,
    file_type: 'image/jpeg',
    name: thumbnailName,
    subFolder: subFolder,
    dimensions: {
      width: thumbnailMetadata.width,
      height: thumbnailMetadata.height,
    },
    fitMode: commonSettings.fit,
    requestedDimensions: {
      width: config.width,
      height: config.height,
    },
  };
};

// Helper function to upload to S3
const uploadToS3 = async (
  s3: AWS.S3,
  folderPath: string,
  fileName: string,
  buffer: Buffer,
  contentType: string,
) => {
  const params = {
    Bucket: folderPath,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
    ACL: 'bucket-owner-full-control',
  };

  return await s3.upload(params).promise();
};

const uploadExceelFile = async (data: any, file: any) => {
  try {
    AWS.config.update({
      accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
      secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
      region: process.env.BUCKET_REGION,
    });
    const folderName = `${BUCKET_NAME}/${BUCKET_FOLDER_NAME}/${data.model_name}`;

    const awsS3 = new AWS.S3();
    // const endUrl = file?.mimetype?.split('/');
    const fileName = `${uuidv4()}`;
    // `${date}_${time}_${uuidv4()}` + '.' + endUrl[endUrl?.length - 1];
    // const fileName = `${date}_${time}_${uuidv4()}}.${file.mimetype.split('/')[1]}`;
    const params = {
      Bucket: folderName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'bucket-owner-full-control',
    };

    await awsS3.upload(params).promise();
    return { url: fileName };
  } catch (error) {
    throw new Error(
      `ERROR: util || s3Upload || s3Upload() ${JSON.stringify(error)}`,
    );
  }
};
export {
  uploadMultipleFiles,
  deleteUploadedMedia,
  uploadPDF,
  uploadSingleFile,
  uploadMultipleFilesWithVariants,
  uploadExceelFile,
};
