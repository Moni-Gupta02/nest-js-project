// import { Controller, Post, Get, Body } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { CreateRoleDto } from '../roles/dto/create-role.dto';
// import { PermissionsDocument } from './Schemas/roles.schema';
// import { RolesService } from './roles.service';
// import { Public } from 'src/common/decorators';

// @ApiTags('roles')
// @Controller('roles')
// export class RolesController {
//   constructor(private readonly roleService: RolesService) {}

//   @Post()
//
//   @ApiOperation({ summary: 'Create a new role' })
//   async createRole(
//     @Body() createRoleDto: CreateRoleDto,
//   ): Promise<PermissionsDocument> {
//     return this.roleService.createRole(createRoleDto);
//   }

//   @Get()
//
//   @ApiOperation({ summary: 'Get all role' })
//   async getAllRoles(): Promise<PermissionsDocument[]> {
//     return this.roleService.getAllRoles();
//   }
// }
import { Controller, Post, Body, Put, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { RolesService } from './roles.service';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('permissions')
@ApiBearerAuth('access-token')
@Controller('permissions')
export class RolesController {
  constructor(private readonly roleService: RolesService) {}

  @Post('create')
  @Permissions({ resource: 'permission', actions: 'create' })
  @ApiOperation({ summary: 'Create a new role' })
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.createRole(createRoleDto);
  }
  @Put(':id')
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: CreateRoleDto,
  ) {
    return this.roleService.updateRole(id, updateRoleDto);
  }

  @Get('list-permissions')
  @Permissions({ resource: 'masterdata', actions: 'list' })
  @ApiOperation({ summary: 'Get all permissions' })
  async getAllRoles(): Promise<any> {
    try {
      const result = await this.roleService.getAllPermissions();
      return {
        message: message.GET_DETAILS,
        data: result,
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
