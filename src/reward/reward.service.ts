import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { MasterDocument } from 'src/common/schema/masterData.schema';
import { CustomerDocument } from 'src/customer/schemas/customer.schema';
import { RemoveRewardDto } from './dto/reward.dto';
import { RewardDocument } from './Schema /reward.schema';

@Injectable()
export class RewardService {
  constructor(
    @InjectModel('rewards')
    private readonly rewardModel: Model<RewardDocument>,
    @InjectModel('masterData')
    private readonly masterModel: Model<MasterDocument>,

    @InjectModel('Customers')
    private readonly customerModel: Model<CustomerDocument>,
  ) {}
  async getRewardHistory(customerId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const rewards = await this.rewardModel
      .find({
        customer_id: new mongoose.Types.ObjectId(customerId),
        status: 'completed',
      })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean();

    console.log('rewards data', rewards);
    const count = await this.rewardModel.countDocuments({
      customer_id: new mongoose.Types.ObjectId(customerId),
      status: 'completed',
    });

    // Format the reward history for the UI
    const formattedRewards = rewards.map((reward) => ({
      title: reward.is_credit
        ? reward.loyalty_benefits
        : //  === 'Social Rewards'
          //   ? 'Social Rewards'
          //   : reward.loyalty_benefits === 'Referral'
          //     ? 'Referral Points'
          //     : 'Purchase Points'
          reward.loyalty_benefits,
      // === 'CX Redeemed'
      //   ? 'CX Redeemed'
      //   : 'Redeemed Points',
      points: reward.is_credit
        ? `+${reward.points_earned} (${reward.earned_amount_wallet.toFixed(1)} AED)`
        : `-${reward.redeem_points} (${reward.redeem_amount_wallet.toFixed(1)} AED)`,
      date: new Date(reward.date),
    }));

    console.log('formatted reward', formattedRewards);

    return {
      rewards: formattedRewards,
      count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }
  // Function to fetch master data
  async getMasterdata(data: any): Promise<any> {
    try {
      // Fetch the master data document from the collection
      const masterData = await this.masterModel.findOne(
        { name: 'master_data' },
        data,
      );
      if (!masterData) {
        throw new Error('Master data not found');
      }
      return masterData;
    } catch (error) {
      console.error('Error fetching master data:', error);
      throw error; // Re-throw the error to handle it in the caller function
    }
  }

  // Function to convert AED to reward points
  async convertCurrencyToReward(rewardValueInAED) {
    try {
      // Fetch the reward point conversion factor from the master data
      const masterdata: any = await this.getMasterdata({
        reward_point: 1,
        _id: 0,
      });

      // Validate masterdata
      if (!masterdata || !masterdata.reward_point) {
        throw new Error(
          'Invalid reward point conversion factor in master data.',
        );
      }

      // Calculate the reward points from AED based on the masterdata reward point
      const point = Math.floor(
        parseFloat(
          (
            (parseFloat(rewardValueInAED.toString()) * 100) /
            parseFloat(masterdata.reward_point)
          ).toFixed(2),
        ),
      );
      return point;
    } catch (error) {
      console.error('Error in converting currency to reward:', error.message);
      throw new Error('Failed to convert currency to reward points.');
    }
  }

  async addReward(
    customerId: string,
    addedRewards: number,
    loyaltyBenefits: string,
  ): Promise<any> {
    try {
      // Calculate points from AED
      const pointsFromAed = await this.convertCurrencyToReward(addedRewards);

      // Fetch customer data
      const customerData: any = await this.customerModel.findById(customerId);

      if (!customerData) {
        throw new Error('Customer not found.');
      }

      // Update reward_wallet and reward_amount_wallet
      customerData.reward_wallet = (
        parseFloat(customerData.reward_wallet || '0') + pointsFromAed
      ).toFixed(2);
      customerData.reward_amount_wallet = (
        parseFloat(customerData.reward_amount_wallet || '0') +
        parseFloat(addedRewards.toString())
      ).toFixed(2);

      // Save the updated customer data
      const updatedCustomerData = await customerData.save();

      // Create a new reward record
      await this.rewardModel.create({
        customer_id: new mongoose.Types.ObjectId(customerId),
        points_earned: pointsFromAed,
        earned_amount_wallet: addedRewards,
        status: 'completed',
        is_credit: true,
        loyalty_benefits: loyaltyBenefits,
        reward_type: 'point',
        is_manual: true,
      });

      return {
        message: 'Reward added successfully.',
        data: updatedCustomerData.reward_amount_wallet,
      };
    } catch (error) {
      console.error('Error adding reward:', error.message);
      throw new Error('Failed to add reward.');
    }
  }

  async removeReward(dto: RemoveRewardDto) {
    try {
      const { customerId, removedReward, reason } = dto;

      // Get customer data first to validate reward amount
      const customerData: any = await this.customerModel.findById(customerId, {
        reward_amount_wallet: 1,
        reward_wallet: 1,
      });

      if (!customerData) {
        throw new Error('Customer not found');
      }

      // Validate if customer has sufficient rewards
      if (
        parseFloat(removedReward.toString()) >
        parseFloat(customerData.reward_amount_wallet)
      ) {
        throw new Error(
          'Insufficient reward balance. Cannot remove more rewards than available.',
        );
      }

      // Get master data for reward points
      const masterdata = await this.masterModel.findOne(
        { name: 'master_data' },
        { reward_point: 1, _id: 0 },
      );

      // Calculate points to remove
      const point = Math.floor(
        parseFloat(
          (
            (parseFloat(removedReward.toString()) * 100) /
            masterdata.reward_point
          ).toFixed(2),
        ),
      );

      // Create reward record
      const rewardRemove = await this.rewardModel.create({
        customer_id: new mongoose.Types.ObjectId(customerId),
        loyalty_benefits: 'CX Redeemed',
        is_credit: false,
        status: 'completed',
        reason,
        loyalty_id: null,
        order_id: null,
        redeem_points: point,
        redeem_amount_wallet: removedReward,
        is_manual: true,
      });

      // Calculate new balances
      const rewardAmount =
        parseFloat(customerData.reward_amount_wallet) -
        parseFloat(removedReward.toString());
      const rewardWallet =
        parseFloat(customerData.reward_wallet) - parseFloat(point.toString());

      // Update customer data
      await this.customerModel.findByIdAndUpdate(customerId, {
        reward_amount_wallet: rewardAmount,
        reward_wallet: rewardWallet,
      });

      return {
        success: true,
        data: rewardAmount,
      };
    } catch (error) {
      // Handle specific errors
      if (
        error.message ===
        'Insufficient reward balance. Cannot remove more rewards than available.'
      ) {
        throw new Error(error.message);
      }
      if (error.message === 'Customer not found') {
        throw new Error(error.message);
      }
      // Handle unexpected errors
      throw new Error('Failed to remove reward: ' + error.message);
    }
  }
}
