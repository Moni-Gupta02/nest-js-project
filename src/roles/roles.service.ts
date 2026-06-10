import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PermissionsDocument } from './Schemas/roles.schema';
import { Model } from 'mongoose';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel('Permissions')
    private readonly rolesModel: Model<PermissionsDocument>,
  ) {}

  async createRole(CreateRoleDto: CreateRoleDto): Promise<PermissionsDocument> {
    const newRole = new this.rolesModel(CreateRoleDto);
    return newRole.save();
  }

  async updateRole(
    id: string,
    updateRoleDto: CreateRoleDto,
  ): Promise<PermissionsDocument> {
    return this.rolesModel
      .findByIdAndUpdate(id, updateRoleDto, { new: true })
      .exec();
  }

  async findRoleByName(name: string): Promise<PermissionsDocument> {
    return this.rolesModel.findOne({ name }).exec();
  }
  // async createRole(createRoleDto: CreateRoleDto): Promise<PermissionsDocument> {
  //   const createdRole = new this.rolesModel(createRoleDto);
  //   return createdRole.save();
  // }

  // async getAllRoles(): Promise<PermissionsDocument[]> {
  //   return this.rolesModel.find().exec();
  // }

  // async findRoleByName(name: string): Promise<PermissionsDocument> {
  //   return this.rolesModel.findOne({ name }).exec();
  // }
  // async getRolePermissions(roleName: string): Promise<string[]> {
  //   const role = await this.rolesModel.findOne({ name: roleName }).exec();
  //   console.log(role, '<role');
  //   // return role ? role.permissions : [];
  //   return;
  // }
  async getAllPermissions(): Promise<any> {
    return await this.rolesModel.aggregate([
      {
        $sort: { group_index: 1 }, // Sort by group_index first
      },
      {
        $project: {
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        },
      },
      {
        $group: {
          _id: { group: '$group', group_index: '$group_index' }, // Group by both group and group_index
          permissions: { $push: '$$ROOT' },
        },
      },
      {
        $sort: { '_id.group_index': 1 }, // Ensure groups are sorted by group_index
      },
      {
        $project: {
          _id: 0,
          group_index: '$_id.group_index',
          group: '$_id.group',
          permissions: 1,
        },
      },
    ]);
  }
}
