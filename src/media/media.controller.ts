import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UploadedFiles,
  Delete,
  UseInterceptors,
  Put,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CreateMediaDto, UpdateMediaDto } from './dto/create-media.dto';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('media')
@ApiBearerAuth('access-token')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('files'))
  @Permissions({ resource: 'masterdata', actions: 'create' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload multiple images with associated metadata',
    type: CreateMediaDto,
    schema: {
      type: 'object',
      properties: {
        modelName: { type: 'string', example: 'ModelName' },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadImages(
    @Body() createMediaDto: CreateMediaDto,
    @UploadedFiles() files,
  ) {
    try {
      console.log('1111');
      const result = await this.mediaService.uploadImages(
        createMediaDto,
        files,
      );
      const message = `Uploaded ${result.uploadedUrls.length} files successfully.`;
      if (result.largeFiles.length > 0) {
        console.log(result);
        return {
          message: `files were not uploaded because size is larger than 100 MB`,
          status: false,
        };
      }
      return {
        message: message,
        data: result.uploadedUrls,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Get('images/:modelName')
  @Permissions({ resource: 'public', actions: 'read' })
  async findAll(@Param('modelName') modelName: string) {
    try {
      const imageLibrary = await this.mediaService.findAll(modelName);
      return {
        message: message.library.IMAGE_LIST,
        data: imageLibrary,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Delete('delete-image/:model_name/:file_name')
  @Permissions({ resource: 'masterdata', actions: 'delete' })
  async remove(
    @Param('file_name') file_name: string,
    @Param('model_name') model_name: string,
  ) {
    try {
      const imageDelete = await this.mediaService.removeImage(
        file_name,
        model_name,
      );
      return {
        message: message.library.IMAGE_DELETE,
        data: imageDelete,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Put('update-image/:id')
  @UseInterceptors(FileInterceptor('files'))
  @Permissions({ resource: 'masterdata', actions: 'update' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update an image with associated metadata',
    type: UpdateMediaDto,
    schema: {
      type: 'object',
      properties: {
        model_name: { type: 'string', example: 'ModelName', nullable: true },
        file_name: { type: 'string', example: 'ModelName', nullable: true },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
            nullable: true,
          },
        },
      },
    },
  })
  async updateImage(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
    @UploadedFile() files,
  ) {
    try {
      const result = await this.mediaService.updateImage(
        id,
        updateMediaDto,
        files,
      );
      return {
        message: result.message,
        data: result.data,
        status: result.status,
      };
    } catch (error) {
      console.log(error, '----error');
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
