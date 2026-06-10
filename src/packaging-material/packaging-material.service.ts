import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { convertedSupplierDetails } from 'src/common/utils/helper';
import { CreatePackagingMaterialDto } from './dto/create-packaging-material.dto';
import { UpdatePackagingMaterialDto } from './dto/update-packaging-material.dto';
import { PackagingMaterialDocument } from './Schemas/packaging-material.entity';
import { HistoryService } from 'src/history/history.service';
import { message } from 'src/common/assets';
import mongoose from 'mongoose';

@Injectable()
export class PackagingMaterialService {
  constructor(
    @InjectModel('PackagingMaterial')
    private packagingMaterialModel: Model<PackagingMaterialDocument>,
    private readonly historyService: HistoryService,
  ) {}
  async create(
    createPackagingMaterialDto: CreatePackagingMaterialDto,
  ): Promise<any> {
    const updatedSupplierDetails = await convertedSupplierDetails(
      createPackagingMaterialDto,
    );
    createPackagingMaterialDto.supplier_details = updatedSupplierDetails;
    console.log(createPackagingMaterialDto, '<<createPackagingMaterialDto');

    const createdIngredient = this.packagingMaterialModel.create({
      ...createPackagingMaterialDto,
      is_active: true,
    });
    return createdIngredient;
  }

  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 0,
    sort: string = 'createdAt',
    order: number = -1, // Default order ascending if sort is provided
  ): Promise<any> {
    // Define the query with optional search
    const query = search && search.trim()
      ? {
          $or: [
            { name: { $regex: new RegExp(search, 'i') } },
            { description: { $regex: new RegExp(search, 'i') } },
          ],
          is_active: true,
        }
      : { is_active: true };

    try {
      // Validate and normalize pagination parameters
      const normalizedPage = Math.max(1, Number(page) || 1);
      const normalizedLimit = Math.max(0, Number(limit) || 0);
      const normalizedSort = sort || 'createdAt';
      const normalizedOrder = Number(order) === 1 ? 1 : -1;

      // Count documents based on the query
      const totalpackagingMaterial =
        await this.packagingMaterialModel.countDocuments(query);

      // Initialize the aggregation pipeline with explicit any[] type
      const pipeline: any[] = [
        { $match: query },
        {
          $addFields: {
            active_supplier: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$supplier_details',
                    as: 'supplier',
                    cond: { $eq: ['$$supplier.is_active', true] },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'active_supplier.supplier',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        {
          $project: {
            name: 1,
            type: 1,
            note: 1,
            category: 1,
            package_type: 1,
            is_active: 1,
            single_package_price: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ['$active_supplier.single_package.price', null] },
                    { $gt: ['$active_supplier.single_package.size', 0] },
                  ],
                },
                then: {
                  $divide: [
                    '$active_supplier.single_package.price',
                    '$active_supplier.single_package.size',
                  ],
                },
                else: '$active_supplier.single_package.price',
              },
            },
            single_package_unit: {
              $toString: '$active_supplier.single_package.unit',
            },
            // bulk_package: {
            //   $cond: {
            //     if: {
            //       $gt: ['$active_supplier.bulk_package.per_kg_price', null],
            //     },
            //     then: {
            //       $concat: [
            //         { $toString: '$active_supplier.bulk_package.per_kg_price' },
            //         ' /kg',
            //       ],
            //     },
            //     else: '$bulk_package_price_per_unit',
            //   },
            // },
            supplier: { $arrayElemAt: ['$supplier.company', 0] },
          },
        },
        { $sort: { [normalizedSort]: normalizedOrder } },
      ];

      // Apply pagination only if limit is greater than 0
      if (normalizedLimit > 0) {
        const skip = normalizedLimit * (normalizedPage - 1);
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: normalizedLimit });
      }

      const packagingMaterial =
        await this.packagingMaterialModel.aggregate(pipeline);

      // Calculate total pages
      let totalPages = 0;
      if (normalizedLimit > 0) {
        totalPages = Math.ceil(totalpackagingMaterial / normalizedLimit);
      } else if (totalpackagingMaterial > 0) {
        totalPages = 1;
      }

      // Prepare the response object
      const response = {
        list: packagingMaterial,
        totalpackagingMaterial,
        currentPage: normalizedPage,
        totalPages,
      };

      return response;
    } catch (error) {
      console.error('Error in findAll packaging material:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<PackagingMaterialDocument> {
    const packagingMaterialDetail = this.packagingMaterialModel.findOne({
      _id: id,
      is_active: true,
    });
    return packagingMaterialDetail;
  }

  async update(
    userId: string,
    id: string,
    updatePackagingMaterialDto: UpdatePackagingMaterialDto,
  ): Promise<PackagingMaterialDocument> {
    let updatedSupplierDetails: any;

    if (updatePackagingMaterialDto?.supplier_details) {
      updatedSupplierDetails = await convertedSupplierDetails(
        updatePackagingMaterialDto,
      );
    }
    console.log(id, '<<< id');
    updatePackagingMaterialDto.supplier_details = updatedSupplierDetails;
    console.log(updatePackagingMaterialDto, '<<<updatePackagingMaterialDto');
    const UpdateIngredient = await this.packagingMaterialModel.findOneAndUpdate(
      { _id: id, is_active: true },
      { ...updatePackagingMaterialDto, is_active: true },
      { new: false },
    );
    console.log({ updatePackagingMaterialDto, UpdateIngredient });
    const { before_changes, current_changes } =
      await this.historyService.getChangedFields(
        UpdateIngredient,
        updatePackagingMaterialDto,
      );
    console.log({ before_changes, current_changes });
    await this.historyService.createHistory(
      userId,
      id,
      'packagingMaterial',
      message.history.HISTORY_UPDATE,
      before_changes,
      current_changes,
    );
    return UpdateIngredient;
  }

  async delete(id: string): Promise<PackagingMaterialDocument> {
    const deletedPackagingMaterial =
      // await this.packagingMaterialModel.findByIdAndDelete(id);
      await this.packagingMaterialModel.findByIdAndUpdate(id, {
        $set: { is_active: false },
      });
    return deletedPackagingMaterial;
  }

  async findAllPackageMaterialsByIds(
    packaging_material_ids: string[],
  ): Promise<any> {
    try {
      const pipeline: any[] = [
        {
          $match: {
            _id: {
              $in: packaging_material_ids.map(
                (item) => new mongoose.Types.ObjectId(item),
              ),
            },
          },
        },
        {
          $addFields: {
            active_supplier: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$supplier_details',
                    as: 'supplier',
                    cond: { $eq: ['$$supplier.is_active', true] },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'active_supplier.supplier',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        {
          $project: {
            name: 1,
            type: 1,
            note: 1,
            category: 1,
            package_type: 1,
            is_active: 1,
            single_package_price: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ['$active_supplier.single_package.price', null] },
                    { $gt: ['$active_supplier.single_package.size', 0] },
                  ],
                },
                then: {
                  $divide: [
                    '$active_supplier.single_package.price',
                    '$active_supplier.single_package.size',
                  ],
                  // 'AED /',
                  // { $toString: '$active_supplier.single_package.unit' },
                },
                else: '$active_supplier.single_package.price',
              },
            },
            single_package_unit: {
              $toString: '$active_supplier.single_package.unit',
            },
            // bulk_package: {
            //   $cond: {
            //     if: {
            //       $gt: ['$active_supplier.bulk_package.per_kg_price', null],
            //     },
            //     then: {
            //       $concat: [
            //         { $toString: '$active_supplier.bulk_package.per_kg_price' },
            //         ' /kg',
            //       ],
            //     },
            //     else: '$bulk_package_price_per_unit',
            //   },
            // },
            supplier: { $arrayElemAt: ['$supplier.company', 0] },
          },
        },
      ];

      const packagingMaterial =
        await this.packagingMaterialModel.aggregate(pipeline);

      // Prepare the response object
      const response = {
        list: packagingMaterial,
        totalpackagingMaterial: packagingMaterial.length,
        currentPage: 1,
        totalPages: 0,
      };

      return response;
    } catch (error) {
      console.error('Error in findAllPackageMaterialsByIds:', error);
      throw error;
    }
  }
}
