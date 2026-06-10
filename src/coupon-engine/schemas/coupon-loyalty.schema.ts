import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LoyaltyDocument = Loyalty & Document;

export enum LoyaltyLevel {
    LEVEL_1 = 'level_1',
    LEVEL_2 = 'level_2',
    LEVEL_3 = 'level_3',
}

export enum LoyaltyType {
    PURCHASED = 'Purchased',
    BIRTHDAY = 'birthday',
    REFERRED_BY = 'referred_by',
    REFERRAL = 'Referral',
    EXCLUSIVE_COINS = 'exclusive_coins',
    RATING = 'rating',
    COUPON = 'Coupon',
}

export enum RewardType {
    REWARD = 'reward',
    DISCOUNT = 'discount',
}

export enum DiscountType {
    PERCENTAGE = 'percentage',
    VALUE = 'value',
}

export enum MinimumPurchase {
    NO_MINIMUM = 'no_minimum',
    MINIMUM_PURCHAGE_VALUE = 'minimum_purchage_value',
    MINIMUM_QUANTITY = 'minimum_quantity',
}

export enum OrderEligibility {
    NDD = 'NDD',
    SUBSCRIPTION = 'subscription',
    ALL = 'all',
}

export enum PlanEligibility {
    TRIAL = 'TRIAL',
    MONTHLY = 'MONTHLY',
    ALL = 'all',
}

export enum CustomerEligibility {
    ALL = 'all',
    NEW = 'new',
    RE_NEW = 're-new',
    SPECIFIC_SEGEMENTS = 'specific_segements',
    SPECIFIC_CUSTOMERS = 'specific_customers',
}

@Schema({
    timestamps: true,
    collection: 'loyalties',
})
export class Loyalty {
    @Prop({ type: String, enum: Object.values(LoyaltyLevel) })
    level?: LoyaltyLevel;

    @Prop({ type: String })
    loyalty_name?: string;

    @Prop({
        type: String,
        enum: Object.values(LoyaltyType),
    })
    loyalty_type?: LoyaltyType;

    @Prop({ type: String })
    description?: string;

    @Prop({
        type: String,
        enum: Object.values(RewardType),
    })
    reward_type?: RewardType;

    @Prop({
        type: String,
        enum: Object.values(DiscountType),
        required: true,
    })
    discount_type: DiscountType;

    @Prop({ type: Number, default: 0 })
    discount_value?: number;

    @Prop({ type: Boolean, default: false })
    max_cap?: boolean;

    @Prop({ type: Number, default: 0 })
    max_discount?: number;

    @Prop({ type: Boolean, default: true })
    active?: boolean;

    @Prop({
        type: String,
        enum: Object.values(MinimumPurchase),
        required: true,
    })
    minimum_purchage: MinimumPurchase;

    @Prop({ type: Number })
    minimum_purchage_value?: number;

    @Prop({
        type: String,
        enum: Object.values(OrderEligibility),
        required: true,
    })
    order_eligibility: OrderEligibility;

    @Prop({
        type: String,
        enum: Object.values(PlanEligibility),
        required: true,
    })
    plan_eligibility: PlanEligibility;

    @Prop({
        type: String,
        enum: Object.values(CustomerEligibility),
        required: true,
    })
    customer_eligibility: CustomerEligibility;

    @Prop({ type: Date })
    start_date?: Date;

    @Prop({ type: Date })
    end_date?: Date;
}

export const LoyaltySchema = SchemaFactory.createForClass(Loyalty);

LoyaltySchema.index({ loyalty_type: 1, createdAt: -1 });
LoyaltySchema.index({ active: 1 });