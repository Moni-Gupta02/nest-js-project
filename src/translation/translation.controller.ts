import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TranslationService } from './translation.service';
import {
  BulkTranslationUpdateDto,
  CreateTranslateDto,
  UpdateTranslateDto,
} from './dto/translation.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import { SearchListQueryDto } from 'src/common/dto/filter.dto';
import {
  CreateMetaScriptDto,
  UpdateMetaScriptDto,
} from './dto/meta-script.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('translation')
@Controller('translation')
@ApiBearerAuth('access-token')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Permissions({ resource: 'translations', actions: 'create' })
  @Post('create')
  @ApiOperation({ summary: 'Create a new translation' })
  async createTranslation(@Body() createTranslateDto: CreateTranslateDto) {
    try {
      const data = await this.translationService.createTranslation(
        createTranslateDto.key,
        createTranslateDto.description,
        createTranslateDto.translations,
      );
      return {
        message: message.CREATE_SUCCESS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'translations', actions: 'list' })
  @Get('list')
  @ApiOperation({ summary: 'Get all translations' })
  async findAllTranslation(@Query() query: SearchListQueryDto) {
    try {
      const { page, limit, search } = query;

      const data = await this.translationService.findAllTranslation(
        search,
        page,
        limit,
      );
      return {
        message: message.GET_DETAILS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'translations', actions: 'read' })
  @Get('detail/:id')
  @ApiOperation({ summary: 'Get a translation by ID' })
  async findOneTranslation(@Param('id') id: string) {
    try {
      const data = await this.translationService.findOneTranslation(id);
      return {
        message: message.GET_DETAILS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'translations', actions: 'read' })
  @Get('get-all-translation/:key')
  @ApiOperation({ summary: 'Get a translation by ID' })
  async findAllTranslationDetails(@Param('key') key: string) {
    try {
      const data = await this.translationService.findAllTranslationDetails(key);
      return {
        message: message.GET_DETAILS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'translations', actions: 'update' })
  @Patch('update/:id')
  @ApiOperation({ summary: 'Update a translation' })
  async updateTranslation(
    @Param('id') id: string,
    @Body() updateTranslateDto: UpdateTranslateDto,
  ) {
    try {
      const data = await this.translationService.updateTranslation(
        id,
        updateTranslateDto,
      );
      return {
        message: message.CREATE_SUCCESS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'translations', actions: 'update' })
  @Post('bulk-update') // Changed from PUT /bulk to POST /bulk-update
  @ApiOperation({
    summary: 'Update multiple translations',
    description:
      'Updates or creates multiple translations in a single operation',
  })
  async updateBulkTranslations(@Body() dto: BulkTranslationUpdateDto) {
    try {
      const data = await this.translationService.updateBulkTranslations(
        dto.key,
        dto.translations,
      );

      return {
        message: 'Update Language successfully',
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'translations', actions: 'delete' })
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete a translation' })
  async removeTranslation(@Param('id') id: string) {
    try {
      const data = await this.translationService.removeTranslation(id);
      return {
        message: message.CREATE_SUCCESS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'meta_script', actions: 'create' })
  @Post('meta-script/create')
  @ApiOperation({ summary: 'Create a new meta script' })
  async create(@Body() createMetaScriptDto: CreateMetaScriptDto) {
    try {
      const data =
        this.translationService.createMetaScript(createMetaScriptDto);
      return {
        message: message.CREATE_SUCCESS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'meta_script', actions: 'list' })
  @Get('meta-script/list')
  async findAllMetaScript(@Query() query: SearchListQueryDto) {
    try {
      const { page, limit, search } = query;

      const data = await this.translationService.findAllMetaScript(
        search,
        page,
        limit,
      );
      return {
        message: message.GET_DETAILS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'meta_script', actions: 'read' })
  @Get('meta-script/details/:id')
  async findOneMetaScript(@Param('id') id: string) {
    try {
      const data = await this.translationService.findOneMetaScript(id);
      return {
        message: message.GET_DETAILS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'meta_script', actions: 'update' })
  @Patch('meta-script/update/:id')
  async updateMetaScript(
    @Param('id') id: string,
    @Body() updateMetaScriptDto: UpdateMetaScriptDto,
  ) {
    try {
      const data = await this.translationService.updateMetaScript(
        id,
        updateMetaScriptDto,
      );
      return {
        message: message.UPDATE_SUCCESS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'meta_script', actions: 'delete' })
  @Delete('meta-script/delete/:id')
  async removeMetaScript(@Param('id') id: string) {
    try {
      const data = await this.translationService.removeMetaScript(id);
      return {
        message: message.DELETE_SUCCESS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
