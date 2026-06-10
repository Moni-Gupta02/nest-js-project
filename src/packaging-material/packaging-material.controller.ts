import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { PackagingMaterialService } from './packaging-material.service';
import {
  CreatePackagingMaterialDto,
  FindPackagingMaterialDto,
} from './dto/create-packaging-material.dto';
import { UpdatePackagingMaterialDto } from './dto/update-packaging-material.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OptionalListFilterDto } from 'src/common/dto/filter.dto';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { HistoryService } from 'src/history/history.service';

@ApiTags('Packaging Material')
@ApiBearerAuth('access-token')
@Controller('packaging-material')
export class PackagingMaterialController {
  constructor(
    private readonly packagingMaterialService: PackagingMaterialService,
    private readonly historyService: HistoryService,
  ) {}

  @Permissions({ resource: 'masterdata', actions: 'create' })
  @Post('create')
  async create(
    @Req() request: Request,
    @Body() createPackagingMaterialDto: CreatePackagingMaterialDto,
  ) {
    try {
      const user = request['user'];

      const createdPackagingMaterial =
        await this.packagingMaterialService.create(createPackagingMaterialDto);
      await this.historyService.createHistory(
        user._id,
        createdPackagingMaterial._id,
        'PackagingMaterial',
        message.history.HISTORY_CREATED,
        null,
        createPackagingMaterialDto,
      );
      return {
        message: message.packagingMaterial.MATERIAL_PACKAGING_CREATED,
        data: createdPackagingMaterial,
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

  @Get('/list')
  @Permissions({ resource: 'public', actions: 'read' })
  async list(@Query() packagingMaterialDto: OptionalListFilterDto) {
    console.log('Ingredient', packagingMaterialDto);

    const ingredientData = await this.packagingMaterialService.findAll(
      packagingMaterialDto.search,
      packagingMaterialDto.page,
      packagingMaterialDto.limit,
      packagingMaterialDto.sort,
      packagingMaterialDto.order,
    );

    return {
      message: message.packagingMaterial.MATERIAL_PACKAGING_LIST,
      data: ingredientData,
      status: true,
    };
  }

  @Get(':id')
  @Permissions({ resource: 'public', actions: 'read' })
  async getById(@Param('id') id: string) {
    const materialPackageData = await this.packagingMaterialService.getById(id);

    return {
      message: message.packagingMaterial.GET_MATERIAL_PACKAGING_DETAIL,
      data: materialPackageData,
      status: true,
    };
  }

  @Patch('update/:id')
  @Permissions({ resource: 'masterdata', actions: 'update' })
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updatePackagingMaterialDto: UpdatePackagingMaterialDto,
  ) {
    try {
      const user = request['user'];
      const updatePackagingMaterial =
        await this.packagingMaterialService.update(
          user._id,
          id,
          updatePackagingMaterialDto,
        );
      return {
        message: message.packagingMaterial.MATERIAL_PACKAGING_UPDATED,
        data: updatePackagingMaterial,
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

  @Delete('delete/:id')
  @Permissions({ resource: 'masterdata', actions: 'delete' })
  async delete(@Param('id') id: string) {
    try {
      const deletedpackagingMaterial =
        await this.packagingMaterialService.delete(id);
      return {
        message: message.packagingMaterial.MATERIAL_PACKAGING_DELETE,
        data: deletedpackagingMaterial,
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

  @Post('/package-materials-by-ids')
  @Permissions({ resource: 'public', actions: 'read' })
  async findAllPackageMaterialsByIds(
    @Body() findPackagingMaterialDto: FindPackagingMaterialDto,
  ) {
    const ingredientData =
      await this.packagingMaterialService.findAllPackageMaterialsByIds(
        findPackagingMaterialDto.packaging_material_ids,
      );

    return {
      message: message.packagingMaterial.MATERIAL_PACKAGING_LIST,
      data: ingredientData,
      status: true,
    };
  }
}
