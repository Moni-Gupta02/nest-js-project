import { Injectable } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { Supplier, SupplierDocument } from './schemas/supplier.schemas';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { getDifferences } from 'src/common/utils/DeepEqual';

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel('Supplier')
    private readonly supplierModel: Model<SupplierDocument>,
  ) {}
  async create(createSupplierDto: CreateSupplierDto): Promise<any> {
    const createdSupplier = await this.supplierModel.create(createSupplierDto);
    return createdSupplier;
  }

  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 0,
    sort: string = 'company',
    order: number = 1,
  ): Promise<any> {
    const query: any = {};

    // Add search conditions to the query if 'search' is provided
    if (search) {
      query.$or = [
        { first_name: { $regex: new RegExp(search, 'i') } },
        { last_name: { $regex: new RegExp(search, 'i') } },
        { email: { $regex: new RegExp(search, 'i') } },
        { company: { $regex: new RegExp(search, 'i') } },
      ];
    }

    // Prepare sorting object
    const sortOrder: any = {};
    sortOrder[sort] = Number(order);

    // Construct the find query
    let findQuery = this.supplierModel.find(query).sort(sortOrder);

    // Apply pagination only if the limit is greater than 0
    if (limit > 0) {
      const skip = (page - 1) * limit;
      findQuery = findQuery.skip(skip).limit(limit);
    }
    const totalSuppliers = await this.supplierModel.countDocuments({
      ...query, // Added query for search
    });
    // Execute the query
    const supplierList = await findQuery.exec();
    let totalPages = 0;
    if (limit > 0) {
      totalPages = Math.ceil(totalSuppliers / limit);
    }
    return {
      list: supplierList,
      totalSuppliers,
      currentPage: +page || 1,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Supplier | null> {
    const supplier = await this.supplierModel
      .findOne({ _id: new mongoose.Types.ObjectId(id) })
      .exec();
    return supplier;
  }
  async getChangedFields(
    previousChange: Record<string, any>,
    currentChange: Record<string, any>,
  ): Promise<{
    current_changes: Record<string, any>;
    before_changes: Record<string, any>;
  }> {
    const beforeChanges: Record<string, any> = {};
    const currentChanges: Record<string, any> = {};

    for (const key of Object.keys(currentChange)) {
      console.log(previousChange, '----', currentChange);
      if (previousChange[key] !== currentChange[key]) {
        beforeChanges[key] = previousChange[key];
        currentChanges[key] = currentChange[key];
      }
    }

    return { before_changes: beforeChanges, current_changes: currentChanges };
  }
  async update(id: string, UpdateSupplierDto: UpdateSupplierDto): Promise<any> {
    const updatedSupplier = await this.supplierModel
      .findByIdAndUpdate(
        id,
        UpdateSupplierDto,
        { new: false },
        // { new: true }, // Set to true to return the updated document
      )
      .exec();
    console.log(updatedSupplier, '<<<<---updatedSupplier');
    const { before_changes, current_changes } = await this.getChangedFields(
      updatedSupplier,
      UpdateSupplierDto,
    );

    const differences = getDifferences(before_changes, current_changes);

    if (
      Object.keys(differences.before_changes).length === 0 &&
      Object.keys(differences.current_changes).length === 0
    ) {
      return { message: 'No changes were made' };
    }

    return differences;
  }

  async remove(id: string): Promise<Supplier | null> {
    const deletedSupplier = await this.supplierModel
      .findByIdAndDelete(id)
      .exec();
    return deletedSupplier;
  }
}
