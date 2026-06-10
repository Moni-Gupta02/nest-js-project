import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ComponentService } from './component.service';
import {
  CreateComponentDto,
  DuplicateComponentDTO,
  FindComponentDto,
} from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { OptionalListFilterDto } from 'src/common/dto/filter.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { UniqueNameService } from 'src/common/utils/uniqueNameService';
import { UniqueComponentIdValidatorService } from 'src/recipes/decorators/unique-component-id-validator';
import { HistoryService } from 'src/history/history.service';

@ApiTags('Component')
@Controller('component')
@ApiBearerAuth('access-token')
export class ComponentController {
  constructor(
    private readonly componentService: ComponentService,
    private readonly uniqueNameService: UniqueNameService,
    private readonly uniqueComponentIdValidatorService: UniqueComponentIdValidatorService,
    private readonly historyService: HistoryService,
  ) {}

  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  @Post('create')
  @Permissions({ resource: 'sub_recipes', actions: 'create' })
  async create(
    @Req() request: Request,
    @Body(ValidationPipe) createComponentDto: CreateComponentDto,
  ) {
    try {
      const user = request['user'];
      const isUnique = await this.uniqueNameService.isNameUnique(
        'component',
        'name',
        (createComponentDto?.name).trim(),
      );
      if (!isUnique) {
        throw new HttpException(
          {
            message: `Sub Recipe '${(createComponentDto?.name).trim()}' already exists!`,
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const data = await this.componentService.create(createComponentDto);
      await this.historyService.createHistory(
        user._id,
        data?._id,
        'sub_recipes',
        message.history.HISTORY_CREATED,
        null,
        createComponentDto,
      );
      return {
        data,
        message: message.component.COMPONENT_CREATED,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException to preserve the status code
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  @Get('list')
  @Permissions({ resource: 'public', actions: 'read' })
  async findAll(@Query() ingredientDto: OptionalListFilterDto) {
    try {
      const componentData = await this.componentService.findAll(
        ingredientDto.search,
        ingredientDto.page,
        ingredientDto.limit,
        ingredientDto.sort,
        ingredientDto.order,
        ingredientDto.recipe_type,
      );
      // const data = await this.componentService.findAll(componentData);
      return {
        componentData,
        message: message.component.COMPONENT_LIST,
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

  // @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  // @Get('list/:name')
  // async findOne(@Param('name') name: string) {
  //   try {
  //     const data = await this.componentService.findOne(name);
  //     return {
  //       data,
  //       message: message.component.COMPONENT_LIST,
  //       status: true,
  //     };
  //   } catch (error) {
  //     if (error instanceof ValidationError) {
  //       handleValidationError(error);
  //     } else {
  //       handleUnexpectedError(error);
  //     }
  //   }
  // }

  @Get(':id')
  @Permissions({ resource: 'public', actions: 'read' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async getComponent(@Param('id') id: string) {
    try {
      const compositionData = await this.componentService.findById(id);
      if (!compositionData) {
        return {
          data: null,
          message: message.component.COMPONENT_VALID_ID,
          status: true,
        };
      }
      return {
        data: compositionData,
        message: message.component.COMPONENT_LIST,
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

  @Patch('update/:id')
  @Permissions({ resource: 'sub_recipes', actions: 'update' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ) {
    try {
      const user = request['user'];
      const areComponentsUnique =
        await this.uniqueComponentIdValidatorService.areComponentsUnique(
          updateComponentDto,
        );

      if (!areComponentsUnique) {
        throw new HttpException(
          {
            message: 'Duplicate Ingredints or Sub-recipes are not allowed.',
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const data = await this.componentService.update(id, updateComponentDto);
      console.log(data.current_changes, '---data.current_changes.type');
      await this.historyService.createHistory(
        user._id,
        id,
        'sub_recipes',
        message.history.HISTORY_UPDATE,
        data.before_changes,
        data.current_changes,
      );

      return {
        data: data?.updateComponent,
        message:
          data.type === 'component'
            ? message.component.COMPONENT_UPDATED
            : message.sub_recipe.SUB_RECIPE_UPDATED,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Delete('delete/:id')
  @Permissions({ resource: 'sub_recipes', actions: 'delete' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async remove(@Param('id') id: string) {
    try {
      const data = await this.componentService.remove(id);
      return {
        data,
        message: message.component.COMPONENT_DELETE,
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

  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  @Post('component-from-ids')
  @Permissions({ resource: 'sub_recipes', actions: 'read' })
  async findManyComponents(
    @Body(ValidationPipe) findComponentsDto: FindComponentDto,
  ) {
    try {
      const data = await this.componentService.findComponents(
        findComponentsDto.component_ids,
      );
      return {
        data,
        message: message.component.COMPONENT_LIST,
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

  @Post('duplicate')
  @Permissions({ resource: 'sub_recipes', actions: 'duplicate' })
  // @ApiConsumes('multipart/form-data')
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async duplicate(
    // @Param('id') compRecipeId: string,
    @Body(ValidationPipe) duplicateDTO: DuplicateComponentDTO,
  ) {
    try {
      const createdDuplicateCompRecipe = await this.componentService.duplicate(
        // compRecipeId,
        duplicateDTO,
      );

      if (createdDuplicateCompRecipe) {
        return {
          message:
            duplicateDTO?.recipe_type == 'sub-recipe'
              ? message.component.SUBRECIPE_DUPLICATE_CREATED
              : message.component.COMPONENT_DUPLICATE_CREATED,
          data: createdDuplicateCompRecipe,
          status: true,
        };
      } else {
        return {
          message: message.component.COMPONENT_DUPLICATE_ERROR,
          data: {},
          status: false,
        };
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  @Post('component-by-ids')
  @Permissions({ resource: 'sub_recipes', actions: 'read' })
  async findAllComponentsByIds(
    @Body(ValidationPipe) findComponentsDto: FindComponentDto,
  ) {
    try {
      const data = await this.componentService.findAllComponentsByIds(
        findComponentsDto.component_ids,
      );
      return {
        data,
        message: message.component.COMPONENT_LIST,
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
