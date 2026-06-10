import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DumpRecipesDocument } from '../common/schema/dump_recipes';

@Injectable()
export class KitchenSummaryReportRepository {
    constructor(
        @InjectModel('Delivery')
        private readonly deliveryModel: Model<any>,
        @InjectModel('Dump_Recipes')
        private readonly dumpRecipesModel: Model<DumpRecipesDocument>,
    ) { }

    async getKitchenSummaryReport(date: Date, phase: string) {
        const startDate = new Date(date);
        startDate.setUTCHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setUTCHours(23, 59, 59, 999);

        const deliveryType =
            phase === 'Batch1' || phase === 'MP' ? 'subscription' : 'NDD';

        return this.deliveryModel
            .find(
                {
                    delivery_date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    delivery_type: deliveryType,
                    not_deliverable: false,
                    is_delivery_freezed: false,
                },
                {
                    _id: 0,
                    delivery_item: 1,
                },
            )
            .lean();
    }

    async getPlatingSummaryReport(date: Date, phase: string) {
        const startDate = new Date(date);
        startDate.setUTCHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setUTCHours(23, 59, 59, 999);

        const deliveryType = phase === 'Batch1' || phase === 'MP'
            ? 'subscription'
            : '';

        return this.deliveryModel.find({
            delivery_date: {
                $gte: startDate,
                $lte: endDate,
            },
            delivery_type: deliveryType,
            not_deliverable: false,
            is_delivery_freezed: false,
        }).lean();
    }

    async getPortioningSummaryReport(date: Date, phase: string) {
        return this.getPortioningDeliveryItems(date, phase);
    }

    async getPortioningDeliveryItems(date: Date, phase: string) {
        const startDate = new Date(date);
        startDate.setUTCHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setUTCHours(23, 59, 59, 999);

        const deliveryType =
            phase === 'Batch1' || phase === 'MP' ? 'subscription' : 'NDD';

        return this.deliveryModel.aggregate([
            {
                $match: {
                    delivery_date: { $gte: startDate, $lte: endDate },
                    delivery_type: deliveryType,
                    not_deliverable: false,
                    is_delivery_freezed: false,
                },
            },
            { $project: { delivery_item: 1, _id: 0 } },
            { $unwind: '$delivery_item' },
            {
                $replaceRoot: {
                    newRoot: {
                        meal_type: '$delivery_item.meal_type',
                        meal_category: '$delivery_item.meal_category',
                        recipe_id: '$delivery_item.recipe_id',
                        dish_name: '$delivery_item.dish_name',
                        qty: '$delivery_item.qty',
                        selected_meal: '$delivery_item.selected_meal',
                    },
                },
            },
        ]);
    }

    async getDumpRecipesForDate(date: Date) {
        const startDate = new Date(date);
        startDate.setUTCHours(0, 0, 0, 0);

        const dumpDoc = await this.dumpRecipesModel
            .findOne({ date: startDate })
            .select({ recipes: 1, _id: 0 })
            .lean();

        if (!dumpDoc?.recipes?.length) {
            const endDate = new Date(date);
            endDate.setUTCHours(23, 59, 59, 999);

            const rangedDoc = await this.dumpRecipesModel
                .findOne({
                    date: { $gte: startDate, $lte: endDate },
                })
                .select({ recipes: 1, _id: 0 })
                .lean();

            if (!rangedDoc?.recipes?.length) {
                return [];
            }

            return rangedDoc.recipes.map((recipe: any) => ({
                ...recipe,
                _id: recipe?._id ?? recipe?.recipe_id,
            }));
        }

        return dumpDoc.recipes.map((recipe: any) => ({
            ...recipe,
            _id: recipe?._id ?? recipe?.recipe_id,
        }));
    }

    async getDumpRecipeData(date: Date) {
        const startDate = new Date(date);
        startDate.setUTCHours(0, 0, 0, 0);

        return this.dumpRecipesModel.aggregate([
            {
                $match: {
                    date: startDate,
                },
            },
            {
                $unwind: {
                    path: '$recipes',
                },
            },
            {
                $match: {
                    'recipes.meal_category': {
                        $ne: 'Meal',
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    recipe_id: '$recipes.recipe_id',
                    name: '$recipes.dish_name',
                    composition: '$recipes.composition',
                },
            },
            {
                $unwind: {
                    path: '$composition',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'components',
                    localField: 'composition.component_id',
                    foreignField: '_id',
                    as: 'compData',
                },
            },
            {
                $unwind: {
                    path: '$compData',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: '$recipe_id',
                    name: {
                        $first: '$name',
                    },
                    composition: {
                        $push: {
                            name: '$compData.name',
                            net_qty: {
                                $arrayElemAt: ['$composition.portioning_balance.net_qty', 0],
                            },
                        },
                    },
                },
            },
        ]);
    }
}