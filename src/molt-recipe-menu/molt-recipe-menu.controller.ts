import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { MoltRecipeMenuService } from './molt-recipe-menu.service';
import { CreateMoltRecipeMenuDto } from './dto/create-molt-recipe-menu.dto';
import { UpdateMoltRecipeMenuDto } from './dto/update-molt-recipe-menu.dto';
import { ListMoltRecipeMenuDto } from './dto/list-molt-recipe-menu.dto';
import { UpdateMoltStatusDto } from './dto/update-molt-status.dto';
import { ServiceApiKeyGuard } from './guards/service-api-key.guard';

@ApiTags('Molt Recipe Menu')
@Controller('molt-recipe-menu')
export class MoltRecipeMenuController {
  constructor(private readonly service: MoltRecipeMenuService) {}

  // ── Delicut kitchen user endpoints (JWT + permission required) ─────────────

  @Post()
  @ApiBearerAuth('access-token')
  @Permissions({ resource: 'molt_recipe_menu', actions: 'create' })
  @ApiOperation({ summary: 'Create a new molt recipe menu manually' })
  @ApiBody({ type: CreateMoltRecipeMenuDto })
  async create(@Body() dto: CreateMoltRecipeMenuDto) {
    const data = await this.service.create(dto);
    return { status: true, message: 'Molt recipe menu created', data };
  }

  @Post('from-delicut/:menu_id')
  @ApiBearerAuth('access-token')
  @Permissions({ resource: 'molt_recipe_menu', actions: 'create' })
  @ApiOperation({
    summary: 'Duplicate a delicut RecipeMenu into a MoltRecipeMenu',
    description:
      'Copies recipe list, dates, and name from an existing delicut RecipeMenu. New menu starts with status pending_approval.',
  })
  @ApiParam({ name: 'menu_id', description: 'Delicut RecipeMenu _id' })
  async createFromDelicut(@Param('menu_id') menuId: string) {
    const data = await this.service.createFromDelicut(menuId);
    return { status: true, message: 'Molt recipe menu created from delicut menu', data };
  }

  @Get('list')
  @ApiBearerAuth('access-token')
  @Permissions({ resource: 'molt_recipe_menu', actions: 'list' })
  @ApiOperation({ summary: 'List molt recipe menus (kitchen staff view)' })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending Approval', 'Approved', 'Rejected', 'Live', 'Archived'] })
  @ApiQuery({ name: 'start_date', required: false, example: '2026-06-01' })
  @ApiQuery({ name: 'end_date', required: false, example: '2026-06-07' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async list(@Query() query: ListMoltRecipeMenuDto) {
    const result = await this.service.list(query);
    return { status: true, message: 'Molt recipe menus fetched', ...result };
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @Permissions({ resource: 'molt_recipe_menu', actions: 'read' })
  @ApiOperation({ summary: 'Get a molt recipe menu by ID' })
  @ApiParam({ name: 'id' })
  async getById(@Param('id') id: string) {
    const data = await this.service.getById(id);
    return { status: true, message: 'Molt recipe menu fetched', data };
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @Permissions({ resource: 'molt_recipe_menu', actions: 'update' })
  @ApiOperation({
    summary: 'Update a molt recipe menu',
    description: 'Update menu name, dates, recipe list, or active/live flags. Only provided fields are updated.',
  })
  @ApiParam({ name: 'id', description: 'MoltRecipeMenu _id' })
  @ApiBody({ type: UpdateMoltRecipeMenuDto })
  async update(@Param('id') id: string, @Body() dto: UpdateMoltRecipeMenuDto) {
    const data = await this.service.update(id, dto);
    return { status: true, message: 'Molt recipe menu updated', data };
  }

  // ── Molt-admin service endpoints (X-Service-Key, hidden from Swagger) ───────

  @Get('service/list')
  @Public()
  @UseGuards(ServiceApiKeyGuard)
  @ApiExcludeEndpoint()
  async serviceList(@Query() query: ListMoltRecipeMenuDto) {
    const result = await this.service.list(query);
    return { status: true, message: 'Molt recipe menus fetched', ...result };
  }

  @Patch('service/:id/status')
  @Public()
  @UseGuards(ServiceApiKeyGuard)
  @ApiExcludeEndpoint()
  async serviceUpdateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMoltStatusDto,
  ) {
    const data = await this.service.updateStatus(id, dto);
    return { status: true, message: 'Molt menu status updated', data };
  }

  @Get('service/approved-dump')
  @Public()
  @UseGuards(ServiceApiKeyGuard)
  @ApiExcludeEndpoint()
  async serviceApprovedDump(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const data = await this.service.getApprovedDump(startDate, endDate);
    return { status: true, message: 'Approved dump fetched', data };
  }

  @Get('service/recipe/:recipe_id')
  @Public()
  @UseGuards(ServiceApiKeyGuard)
  @ApiExcludeEndpoint()
  async serviceGetRecipeById(@Param('recipe_id') recipeId: string) {
    const data = await this.service.getRecipeById(recipeId);
    return { status: true, message: 'Recipe fetched', data };
  }

  @Patch('service/:id/recipe-statuses')
  @Public()
  @UseGuards(ServiceApiKeyGuard)
  @ApiExcludeEndpoint()
  async serviceUpdateRecipeStatuses(
    @Param('id') id: string,
    @Body() body: { recipe_statuses: { recipe_id: string; status: string }[]; admin_comments?: string; approved_by?: string },
  ) {
    const data = await this.service.updateRecipeStatuses(id, body);
    return { status: true, message: 'Recipe statuses updated', data };
  }

  @Get('service/:menu_id')
  @Public()
  @UseGuards(ServiceApiKeyGuard)
  @ApiExcludeEndpoint()
  async serviceGetMenuById(@Param('menu_id') menuId: string) {
    const data = await this.service.getById(menuId);
    return { status: true, message: 'Molt recipe menu fetched', data };
  }
}
