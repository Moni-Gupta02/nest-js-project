import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MoltRecipeMenuDocument,
  MoltMenuStatus,
} from './schemas/molt-recipe-menu.schema';
import { RecipeMenuDocument } from 'src/recipe-menu/Schemas/recipe_menu.schema';
import { RecipeDocument } from 'src/recipes/schemas/recipe.schema';
import { MasterDataDocument } from 'src/masterdata/Schemas/masterdata.schema';
import { CreateMoltRecipeMenuDto } from './dto/create-molt-recipe-menu.dto';
import { UpdateMoltRecipeMenuDto } from './dto/update-molt-recipe-menu.dto';
import { ListMoltRecipeMenuDto } from './dto/list-molt-recipe-menu.dto';
import { UpdateMoltStatusDto } from './dto/update-molt-status.dto';

@Injectable()
export class MoltRecipeMenuService {
  private masterDataCache = new Map<string, string>();

  constructor(
    @InjectModel('Molt_Recipe_Menu')
    private readonly moltMenuModel: Model<MoltRecipeMenuDocument>,
    @InjectModel('Recipe_Menu')
    private readonly recipeMenuModel: Model<RecipeMenuDocument>,
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel('MasterDataKMS')
    private readonly masterDataModel: Model<MasterDataDocument>,
  ) {}

  private async resolveMasterDataLabel(id: string): Promise<string> {
    if (!id || !Types.ObjectId.isValid(id)) return id ?? '';
    if (this.masterDataCache.has(id)) return this.masterDataCache.get(id)!;
    const doc = await this.masterDataModel.findById(id).lean();
    const label = (doc as any)?.label ?? '';
    this.masterDataCache.set(id, label);
    return label;
  }

  private toUTCDay(d: Date): Date {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  }

  private async assertNoDuplicateDate(startDate: Date, endDate: Date, excludeId?: string) {
    const filter: Record<string, unknown> = {
      startDate: this.toUTCDay(startDate),
      endDate: this.toUTCDay(endDate),
    };
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.moltMenuModel.findOne(filter).lean();
    if (existing) {
      throw new BadRequestException(
        `A molt recipe menu already exists for ${startDate.toISOString().slice(0, 10)} – ${endDate.toISOString().slice(0, 10)}`,
      );
    }
  }

  async create(dto: CreateMoltRecipeMenuDto): Promise<MoltRecipeMenuDocument> {
    const startDate = this.toUTCDay(new Date(dto.startDate));
    const endDate = this.toUTCDay(new Date(dto.endDate));

    await this.assertNoDuplicateDate(startDate, endDate);

    const menu = new this.moltMenuModel({
      name: dto.name,
      menu_number: dto.menu_number,
      is_active: dto.is_active ?? true,
      is_live: dto.is_live ?? false,
      startDate,
      endDate,
      recipe: (dto.recipe ?? []).map((r) => ({
        ...r,
        recipe_id: new Types.ObjectId(r.recipe_id),
      })),
      vendor_id: process.env.MOLT_DELICUT_VENDOR_ID ?? '',
      status: MoltMenuStatus.PENDING_APPROVAL,
    });
    return menu.save();
  }

  async createFromDelicut(sourceMenuId: string): Promise<MoltRecipeMenuDocument> {
    if (!Types.ObjectId.isValid(sourceMenuId)) {
      throw new BadRequestException('Invalid source_menu_id');
    }

    const source = await this.recipeMenuModel.findById(sourceMenuId).lean();
    if (!source) {
      throw new NotFoundException('Delicut recipe menu not found');
    }

    const startDate = this.toUTCDay(source.startDate ?? new Date());
    const endDate = this.toUTCDay(source.endDate ?? new Date());

    await this.assertNoDuplicateDate(startDate, endDate);

    // Copy all RecipeMenu fields exactly, only add molt status fields
    const menu = new this.moltMenuModel({
      source_menu_id: new Types.ObjectId(sourceMenuId),
      name: source.name,
      menu_number: source.menu_number,
      recipe: source.recipe ?? [],
      is_active: source.is_active ?? true,
      is_live: source.is_live ?? false,
      startDate,
      endDate,
      vendor_id: process.env.MOLT_DELICUT_VENDOR_ID ?? '',
      status: MoltMenuStatus.PENDING_APPROVAL,
    });
    return menu.save();
  }

  async list(query: ListMoltRecipeMenuDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.start_date || query.end_date) {
      const dateFilter: Record<string, Date> = {};
      if (query.start_date) dateFilter.$gte = new Date(query.start_date);
      if (query.end_date) dateFilter.$lte = new Date(query.end_date);
      filter.startDate = dateFilter;
    }

    const [data, total] = await Promise.all([
      this.moltMenuModel
        .find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.moltMenuModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, dto: UpdateMoltRecipeMenuDto): Promise<MoltRecipeMenuDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    const set: Record<string, unknown> = {};

    if (dto.name !== undefined) set.name = dto.name;
    if (dto.menu_number !== undefined) set.menu_number = dto.menu_number;
    if (dto.is_active !== undefined) set.is_active = dto.is_active;
    if (dto.is_live !== undefined) set.is_live = dto.is_live;

    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const existing = await this.moltMenuModel.findById(id).lean();
      if (!existing) throw new NotFoundException('Molt recipe menu not found');

      const newStart = dto.startDate ? this.toUTCDay(new Date(dto.startDate)) : (existing.startDate as Date);
      const newEnd = dto.endDate ? this.toUTCDay(new Date(dto.endDate)) : (existing.endDate as Date);

      const startChanged = dto.startDate !== undefined;
      const endChanged = dto.endDate !== undefined;
      if (startChanged || endChanged) {
        await this.assertNoDuplicateDate(newStart, newEnd, id);
      }

      if (startChanged) set.startDate = newStart;
      if (endChanged) set.endDate = newEnd;
    }

    if (dto.recipe !== undefined) {
      set.recipe = dto.recipe.map((r) => ({
        ...r,
        ...(r.recipe_id ? { recipe_id: new Types.ObjectId(r.recipe_id) } : {}),
      }));
    }

    if (Object.keys(set).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.moltMenuModel
      .findByIdAndUpdate(id, { $set: set }, { new: true })
      .lean();
    if (!updated) throw new NotFoundException('Molt recipe menu not found');
    return updated as unknown as MoltRecipeMenuDocument;
  }

  async getById(id: string): Promise<MoltRecipeMenuDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const menu = await this.moltMenuModel
      .findById(id)
      .populate({
        path: 'recipe.recipe_id',
        model: 'Recipes_Detail',
        populate: [
          { path: 'cuisine', model: 'Cuisines' },
          { path: 'dish_type', model: 'Dishtypes' },
        ],
      })
      .lean();
    if (!menu) throw new NotFoundException('Molt recipe menu not found');
    return menu as unknown as MoltRecipeMenuDocument;
  }

  async updateStatus(id: string, dto: UpdateMoltStatusDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const update: Record<string, unknown> = { status: dto.status };
    if (dto.admin_comments !== undefined) update.admin_comments = dto.admin_comments;
    if (dto.approved_by !== undefined) update.approved_by = dto.approved_by;

    const updated = await this.moltMenuModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();
    if (!updated) throw new NotFoundException('Molt recipe menu not found');
    return updated;
  }

  async getApprovedDump(startDate?: string, endDate?: string) {
    const filter: Record<string, unknown> = {
      status: { $in: [MoltMenuStatus.APPROVED] },
    };
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      filter.startDate = dateFilter;
    }
    const menus = await this.moltMenuModel.find(filter).lean();
    const vendorId = process.env.MOLT_DELICUT_VENDOR_ID ?? '';
    const rows: Record<string, unknown>[] = [];
    for (const menu of menus) {
      const dates = this.getDateRange(menu.startDate as Date, menu.endDate as Date);
      const approvedRecipes = (menu.recipe as any[]).filter(
        (r) => r.status === 'Approved',
      );

      for (const menuRecipe of approvedRecipes) {
        const recipeId = new Types.ObjectId(menuRecipe.recipe_id);
        const types: { protein_option: string[]; protein_category: string }[] =
          Array.isArray(menuRecipe.type) ? menuRecipe.type : [];

        const DUMP_ALLOWED_CATEGORIES = ['balance', 'low'];

        const proteinType = [...new Set(types.flatMap((t) => t.protein_option ?? []))];
        const rawCategories = types.length
          ? [...new Set(types.map((t) => t.protein_category).filter(Boolean))]
          : DUMP_ALLOWED_CATEGORIES;
        const proteinCategory = rawCategories.filter((c) => DUMP_ALLOWED_CATEGORIES.includes(c));
        // If menu has no balance/low types, default to both
        const effectiveCategories = proteinCategory.length ? proteinCategory : DUMP_ALLOWED_CATEGORIES;

        // Filter types to only balance/low for variant building
        const filteredTypes = types.filter((t) => DUMP_ALLOWED_CATEGORIES.includes(t.protein_category));
        const [recipeData, variants, ingredients] = await Promise.all([
          this.recipeModel
            .findById(recipeId)
            .populate('dish_type')
            .populate('cuisine')
            .populate('allergens')
            .lean(),
          this.buildVariantsForDump(recipeId, proteinType, effectiveCategories, filteredTypes),
          this.buildIngredientsForDump(recipeId, effectiveCategories),
        ]);

        if (!recipeData) continue;

        // Resolve MasterData ID fields to their label values
        const r = recipeData as any;
        const [spiceLevel, cookingComplexity, platingComplexity] = await Promise.all([
          this.resolveMasterDataLabel(r.spice_level),
          this.resolveMasterDataLabel(r.cooking_complexity),
          this.resolveMasterDataLabel(r.plating_complexity),
        ]);

        const dishType = Array.isArray(recipeData.dish_type)
          ? recipeData.dish_type.map((d: any) => (d?.name ?? d))
          : [];
        const cuisine =
          recipeData.cuisine && typeof recipeData.cuisine === 'object'
            ? (recipeData.cuisine as any).name ?? ''
            : recipeData.cuisine ?? '';
        const allergens = Array.isArray(recipeData.allergens)
          ? recipeData.allergens.map((a: any) => (a?.name ?? a)).filter(Boolean)
          : [];
        const proteinCategoryInfo = this.buildProteinCategoryInfo(r, effectiveCategories);
        const packageMaterial = this.buildPackageMaterial(r, proteinType, proteinCategory);

        // internal_photos → molt converts to website_image
        // priority: final_dish_image → protein_category.internal_image → protein_category.image
        let internalPhotos: string[] = [];
        if (Array.isArray(r.final_dish_image) && r.final_dish_image.length) {
          internalPhotos = r.final_dish_image.map((img: any) => img?.url ?? img).filter(Boolean);
        }
        if (!internalPhotos.length && Array.isArray(r.protein_category)) {
          for (const pc of r.protein_category) {
            const internalImgs = Array.isArray(pc?.internal_image) ? pc.internal_image.filter(Boolean) : [];
            if (internalImgs.length) { internalPhotos = internalImgs; break; }
            const imgs = Array.isArray(pc?.image) ? pc.image.filter(Boolean) : [];
            if (imgs.length) { internalPhotos = imgs; break; }
          }
        }

        const row: Record<string, unknown> = {
          recipe_id: recipeId.toString(),
          vendor_id: vendorId,
          vendor: { name: 'Delicut', vendor_id: vendorId },
          meal_category: r.meal_category ?? '',
          dish_name: r.dish_name ?? '',
          description: r.description ?? '',
          dish_type: dishType,
          cuisine,
          ingredients,
          allergens,
          highly_perishable: r.highly_perishable ?? false,
          variants,
          package_material: packageMaterial,
          internal_photos: internalPhotos,
          protein_category_info: proteinCategoryInfo,
          spice_level: spiceLevel,
          cooking_complexity: cookingComplexity,
          plating_complexity: platingComplexity,
        };

        for (const date of dates) {
          rows.push({ ...row, date });
        }
      }

      // Mark menu as Live directly in DB — failure must not affect dump rows
      try {
        await this.moltMenuModel.findByIdAndUpdate(
          menu._id,
          { $set: { status: MoltMenuStatus.LIVE } },
        );
      } catch {
        // log silently — dump rows are already built
      }
    }
    return rows;
  }

  private getDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    current.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);
    while (current <= end) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  private async buildVariantsForDump(
    recipeId: Types.ObjectId,
    proteinType: string[],
    proteinCategory: string[],
    types: { protein_option: string[]; protein_category: string }[],
  ): Promise<Record<string, unknown>[]> {
    if (!proteinType.length) return [];

    const variantData: any[] = await this.recipeModel.aggregate([
      { $match: { _id: recipeId } },
      { $unwind: { path: '$composition', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'components',
          localField: 'composition.component_id',
          foreignField: '_id',
          as: 'componentData',
          pipeline: [
            { $addFields: { allergensId: { $map: { input: '$allergens', as: 'strId', in: { $toObjectId: '$$strId' } } } } },
            { $lookup: { from: 'allergens', localField: 'allergensId', foreignField: '_id', as: 'allergensData' } },
            { $addFields: { allergensName: { $map: { input: '$allergensData', as: 'a', in: '$$a.name' } } } },
          ],
        },
      },
      { $unwind: { path: '$composition.portioning_balance', preserveNullAndEmptyArrays: true } },
      { $match: { 'composition.portioning_balance.protein_category': { $in: proteinCategory } } },
      {
        $group: {
          _id: {
            protein_type: '$composition.portioning_balance.protein_type',
            type: '$composition.portioning_balance.type',
            protein_category: '$composition.portioning_balance.protein_category',
          },
          kcal: { $sum: { $ifNull: ['$composition.portioning_balance.kcal', 0] } },
          fat: { $sum: { $ifNull: ['$composition.portioning_balance.fat', 0] } },
          carb: { $sum: { $ifNull: ['$composition.portioning_balance.carb', 0] } },
          protein: { $sum: { $ifNull: ['$composition.portioning_balance.protein', 0] } },
          price: { $sum: { $ifNull: ['$composition.portioning_balance.price', 0] } },
          net_qty: { $sum: { $ifNull: ['$composition.portioning_balance.net_qty', 0] } },
          component: {
            $push: {
              component_id: { $arrayElemAt: ['$componentData._id', 0] },
              type: '$composition.type',
            },
          },
          components: {
            $push: {
              name: { $arrayElemAt: ['$componentData.name', 0] },
              allergens: { $arrayElemAt: ['$componentData.allergensName', 0] },
              kcal: '$composition.portioning_balance.kcal',
              fat: '$composition.portioning_balance.fat',
              carb: '$composition.portioning_balance.carb',
              protein: '$composition.portioning_balance.protein',
              price: '$composition.portioning_balance.price',
              net_qty: '$composition.portioning_balance.net_qty',
              protein_category: '$composition.portioning_balance.protein_category',
              component_id: { $arrayElemAt: ['$componentData._id', 0] },
              packaging_material: '$composition.portioning_balance.packaging_material',
              material: '$composition.portioning_balance.material',
              description: '$composition.portioning_balance.description',
              instruction: '$composition.portioning_balance.instruction',
              is_main: '$composition.portioning_balance.is_main',
              is_inside: '$composition.portioning_balance.is_inside',
              is_separate: '$composition.portioning_balance.is_separate',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          protein_option: '$_id.protein_type',
          size: '$_id.type',
          protein_category: '$_id.protein_category',
          kcal: { $floor: '$kcal' },
          fat: { $floor: '$fat' },
          carb: { $floor: '$carb' },
          protein: { $floor: '$protein' },
          price: { $round: ['$price', 2] },
          net_qty: { $floor: '$net_qty' },
          component: 1,
          components: 1,
        },
      },
      { $match: { protein_option: { $in: proteinType } } },
      {
        $facet: {
          componentMatch: [
            { $unwind: { path: '$component', preserveNullAndEmptyArrays: true } },
            { $match: { 'component.type': { $regex: 'Protein', $options: 'i' } } },
            {
              $graphLookup: {
                from: 'components',
                startWith: '$component.component_id',
                connectFromField: 'composition.component_id',
                connectToField: '_id',
                as: 'subRecipes',
                maxDepth: 10,
                depthField: 'depth',
              },
            },
            { $addFields: { allComponents: { $concatArrays: [['$$ROOT'], '$subRecipes'] } } },
            { $unwind: { path: '$allComponents', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$allComponents.composition', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: { protein_option: '$protein_option', size: '$size', protein_category: '$protein_category' },
                kcal: { $first: '$kcal' },
                fat: { $first: '$fat' },
                carb: { $first: '$carb' },
                protein: { $first: '$protein' },
                price: { $first: '$price' },
                net_qty: { $first: '$net_qty' },
                components: { $first: '$components' },
                ingredientIds: { $addToSet: '$allComponents.composition.ingredient_id' },
              },
            },
            {
              $project: {
                _id: 0,
                protein_option: '$_id.protein_option',
                size: '$_id.size',
                protein_category: '$_id.protein_category',
                kcal: { $round: ['$kcal', 2] },
                fat: { $round: ['$fat', 2] },
                carb: { $round: ['$carb', 2] },
                protein: { $round: ['$protein', 2] },
                price: 1,
                net_qty: 1,
                components: 1,
                ingredientIds: { $filter: { input: '$ingredientIds', as: 'i', cond: { $ne: ['$$i', null] } } },
              },
            },
            {
              $lookup: {
                from: 'ingredients',
                localField: 'ingredientIds',
                foreignField: '_id',
                as: 'ingredientDetails',
                pipeline: [
                  { $match: { show_customers: true } },
                  { $project: { name_of_customers: 1 } },
                ],
              },
            },
            {
              $project: {
                _id: 0,
                protein_option: 1,
                size: 1,
                protein_category: 1,
                kcal: 1,
                fat: 1,
                carb: 1,
                protein: 1,
                price: 1,
                net_qty: 1,
                components: 1,
                variant_ingredients: {
                  $map: { input: '$ingredientDetails', as: 'ing', in: '$$ing.name_of_customers' },
                },
              },
            },
          ],
          defaultCase: [
            {
              $group: {
                _id: { protein_option: '$protein_option', size: '$size', protein_category: '$protein_category' },
                kcal: { $first: '$kcal' },
                fat: { $first: '$fat' },
                carb: { $first: '$carb' },
                protein: { $first: '$protein' },
                price: { $first: '$price' },
                components: { $first: '$components' },
              },
            },
            {
              $project: {
                _id: 0,
                protein_option: '$_id.protein_option',
                size: '$_id.size',
                protein_category: '$_id.protein_category',
                kcal: { $round: ['$kcal', 2] },
                fat: { $round: ['$fat', 2] },
                carb: { $round: ['$carb', 2] },
                protein: { $round: ['$protein', 2] },
                price: 1,
                components: 1,
                variant_ingredients: { $literal: [] },
              },
            },
          ],
        },
      },
      {
        $project: {
          result: {
            $cond: { if: { $gt: [{ $size: '$componentMatch' }, 0] }, then: '$componentMatch', else: '$defaultCase' },
          },
        },
      },
      { $unwind: '$result' },
      { $replaceRoot: { newRoot: '$result' } },
      { $match: { net_qty: { $ne: 0 } } },
    ]);

    // Filter by exact type[] matches (protein_option + protein_category)
    const result: Record<string, unknown>[] = [];
    for (const typeItem of types) {
      const matchingVariants = variantData.filter(
        (v) =>
          typeItem.protein_option.includes(v.protein_option) &&
          v.protein_category === typeItem.protein_category,
      );
      for (const v of matchingVariants) {
        const packMap = new Map<string, any>();
        const allergenSet = new Set<string>();
        for (const comp of v.components ?? []) {
          const allergens = Array.isArray(comp.allergens) ? comp.allergens : [];
          allergens.forEach((a: string) => a && allergenSet.add(a));
          const packId = comp.packaging_material?.toString();
          if (packId && !packMap.has(packId)) {
            packMap.set(packId, {
              material: comp.material,
              description: comp.description,
              instruction: comp.instruction,
              is_main: comp.is_main,
              is_inside: comp.is_inside,
              is_separate: comp.is_separate,
              allergens,
            });
          }
        }
        result.push({
          variant: '',
          size: v.size,
          kcal: v.kcal,
          protein: v.protein,
          carb: v.carb,
          fat: v.fat,
          protein_option: v.protein_option,
          protein_category: v.protein_category,
          variant_ingredients: v.variant_ingredients ?? [],
          price: v.price,
          packaging_material: Array.from(packMap.values()),
          components: v.components ?? [],
        });
      }
    }
    return result;
  }

  private async buildIngredientsForDump(
    recipeId: Types.ObjectId,
    proteinCategory: string[],
  ): Promise<{ protein_category: string; ingredients: string[] }[]> {
    return this.recipeModel.aggregate([
      { $match: { _id: recipeId } },
      { $unwind: { path: '$composition', preserveNullAndEmptyArrays: true } },
      { $match: { 'composition.type': { $not: { $regex: 'Protein', $options: 'i' } } } },
      { $unwind: { path: '$composition.protein_category', preserveNullAndEmptyArrays: true } },
      { $match: { 'composition.protein_category': { $in: proteinCategory } } },
      {
        $graphLookup: {
          from: 'components',
          startWith: '$composition.component_id',
          connectFromField: 'composition.component_id',
          connectToField: '_id',
          as: 'subRecipes',
          maxDepth: 10,
          depthField: 'depth',
        },
      },
      { $unwind: { path: '$subRecipes', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$subRecipes.composition', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          ingredientId: '$subRecipes.composition.ingredient_id',
          protein_category: '$composition.protein_category',
        },
      },
      {
        $group: {
          _id: '$protein_category',
          ingredientIds: { $addToSet: '$ingredientId' },
        },
      },
      {
        $lookup: {
          from: 'ingredients',
          let: { ids: '$ingredientIds' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$ids'] }, show_customers: true } },
            { $project: { name_of_customers: 1 } },
          ],
          as: 'ingredientDetails',
        },
      },
      {
        $project: {
          _id: 0,
          protein_category: '$_id',
          ingredients: '$ingredientDetails.name_of_customers',
        },
      },
    ]);
  }

  private buildThumbUrl(imageUrl: string, variant: '331x206' | '88x106'): string {
    const raw = String(imageUrl ?? '').trim();
    if (!raw) return '';
    if (raw.includes('/thumbnails/')) return raw;
    const thumbDir = variant === '331x206' ? 'thumbnail_350_400' : 'thumbnail_100_100';
    if (raw.includes('/compressed/')) {
      return raw.replace('/compressed/', `/thumbnails/${thumbDir}/`);
    }
    // rms/dishes/filename.png → rms/dishes/thumbnails/thumbnail_350_400/filename.png
    const lastSlash = raw.lastIndexOf('/');
    if (lastSlash === -1) return raw;
    return `${raw.substring(0, lastSlash)}/thumbnails/${thumbDir}/${raw.substring(lastSlash + 1)}`;
  }

  private buildProteinCategoryInfo(recipeData: any, proteinCategory: string[]): Record<string, unknown>[] {
    const categories: any[] = Array.isArray(recipeData?.protein_category) ? recipeData.protein_category : [];
    return categories
      .filter((pc) => proteinCategory.includes(pc?.category))
      .map((pc) => {
        const images: string[] = Array.isArray(pc?.image) ? pc.image.filter(Boolean) : [];
        const first = images[0] ?? '';
        return {
          category: pc?.category ?? '',
          dish_name: pc?.dish_name ?? recipeData?.dish_name ?? '',
          description: pc?.description ?? recipeData?.description ?? '',
          image: images,
          image_thumb_331x206: this.buildThumbUrl(first, '331x206'),
          image_thumb_88x106: this.buildThumbUrl(first, '88x106'),
        };
      });
  }

  private buildPackageMaterial(recipeData: any, proteinType: string[], proteinCategory: string[]): Record<string, unknown>[] {
    const compositions: any[] = Array.isArray(recipeData?.composition) ? recipeData.composition : [];
    const seen = new Set<string>();
    const result: Record<string, unknown>[] = [];
    for (const comp of compositions) {
      const hasMatchingPortioning = (comp.portioning_balance ?? []).some(
        (pb: any) =>
          proteinType.includes(pb.protein_type) &&
          proteinCategory.includes(pb.protein_category),
      );
      if (!hasMatchingPortioning) continue;
      const packId = comp.packaging_material?.toString() ?? '';
      if (packId && seen.has(packId)) continue;
      if (packId) seen.add(packId);
      result.push({
        instruction: comp.instruction ?? '',
        is_seperate: comp.is_separate ?? false,
      });
    }
    return result;
  }

  async updateRecipeStatuses(
    menuId: string,
    payload: {
      recipe_statuses: { recipe_id: string; status: string }[];
      admin_comments?: string;
      approved_by?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(menuId)) {
      throw new BadRequestException('Invalid menu id');
    }

    const menu = await this.moltMenuModel.findById(menuId);
    if (!menu) throw new NotFoundException('Molt recipe menu not found');

    const statusMap = new Map<string, string>();
    for (const rs of payload.recipe_statuses ?? []) {
      if (rs.recipe_id) statusMap.set(rs.recipe_id, rs.status);
    }

    for (const recipeItem of menu.recipe as any[]) {
      const rid = String(recipeItem.recipe_id ?? '');
      if (statusMap.has(rid)) {
        recipeItem.status = statusMap.get(rid);
      }
    }

    // Derive overall menu status from recipe statuses
    const allStatuses = (menu.recipe as any[]).map((r: any) => r.status ?? 'Pending Approval');
    const allApproved = allStatuses.every((s) => s === 'Approved');
    const allRejected = allStatuses.every((s) => s === 'Rejected');
    const anyPending = allStatuses.some((s) => s === 'Pending Approval');

    if (allApproved) {
      menu.status = MoltMenuStatus.APPROVED;
    } else if (allRejected) {
      menu.status = MoltMenuStatus.REJECTED;
    } else if (anyPending) {
      menu.status = MoltMenuStatus.PENDING_APPROVAL;
    } else {
      menu.status = MoltMenuStatus.APPROVED; // partially approved → approved
    }

    if (payload.admin_comments !== undefined) menu.admin_comments = payload.admin_comments;
    if (payload.approved_by !== undefined) menu.approved_by = payload.approved_by;

    menu.markModified('recipe');
    await menu.save();

    const populated = await this.moltMenuModel
      .findById(menuId)
      .populate({
        path: 'recipe.recipe_id',
        model: 'Recipes_Detail',
        populate: [
          { path: 'cuisine', model: 'Cuisines' },
          { path: 'dish_type', model: 'Dishtypes' },
        ],
      })
      .lean();
    return populated ?? menu.toObject();
  }

  async getRecipeById(recipeId: string) {
    if (!Types.ObjectId.isValid(recipeId)) {
      throw new BadRequestException('Invalid recipe_id');
    }
    const recipe = await this.recipeModel
      .findById(recipeId)
      .populate({ path: 'cuisine', model: 'Cuisines' })
      .populate({ path: 'dish_type', model: 'Dishtypes' })
      .populate({ path: 'allergens', model: 'Allergens' })
      .lean();
    if (!recipe) throw new NotFoundException('Recipe not found');
    return recipe;
  }

}
