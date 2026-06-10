import { Injectable } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Leads, LeadsDocument } from './schemas/lead.schema';
import * as moment from 'moment';
import { CustomerDocument } from 'src/customer/schemas/customer.schema';
import { ClevertapService } from 'src/common/utils/clevertapService';
import { UpdateLeadDto } from './dto/update-lead.dto';
@Injectable()
export class LeadsService {
  constructor(
    @InjectModel('Leads') private readonly leadsModel: Model<LeadsDocument>,
    @InjectModel('Customers')
    private readonly customerModel: Model<CustomerDocument>,
    private clevertapService: ClevertapService,
  ) {}

  async createLead(createLeadDto: CreateLeadDto): Promise<any> {
    try {
      const { email, mobile_number, name } = createLeadDto;

      if (email || mobile_number) {
        // Extract first and last name
        const [firstName, ...lastNameParts] = (name || '').split(' ');
        const lastName = lastNameParts.join(' ');

        // Check for existing customer
        const existingCustomer = await this.findExistingCustomer(
          email,
          mobile_number,
        );

        console.log({ existingCustomer });
        if (!existingCustomer) {
          const customerData = {
            first_name: firstName,
            last_name: lastName,
            email,
            country_code:
              createLeadDto.country_code === '+971'
                ? createLeadDto.country_code
                : '',
            whatsapp_country_code: createLeadDto.country_code,
            whatsapp_number: mobile_number,
            phone_number: mobile_number,
            user_register_flag: 'user_not_verified',
            source: 'leads',
          };

          const newCustomer = await this.customerModel.create(customerData);

          // Send Clevertap event
          const properties: Record<string, string> = {
            'First Name': firstName,
            'Last Name': lastName,
          };

          if (email) properties['Email'] = email;
          if (mobile_number)
            properties['Phone'] =
              `${createLeadDto.country_code}${mobile_number}`;

          const cledara = await this.clevertapService.sendEvent(
            newCustomer,
            properties,
          );
          console.log({ cledara });
        }
      }
      console.log({ createLeadDto });
      // Create lead
      const createdLead = await this.leadsModel.create(createLeadDto);
      return createdLead;
    } catch (error) {
      console.error('Error in creating lead:', error);
      throw new Error(`Failed to create lead: ${error.message}`);
    }
  }

  private async findExistingCustomer(
    email?: string,
    mobileNumber?: string,
  ): Promise<CustomerDocument | null> {
    if (email && mobileNumber) {
      return this.customerModel.findOne({
        $or: [
          { email },
          { mobile_number: mobileNumber },
          { whatsapp_number: mobileNumber },
        ],
      });
    } else if (email) {
      return this.customerModel.findOne({ email });
    } else if (mobileNumber) {
      return this.customerModel.findOne({
        $or: [
          { mobile_number: mobileNumber },
          { whatsapp_number: mobileNumber },
        ],
      });
    }
    return null;
  }

  async updateLead(id: string, updateLeadDto: UpdateLeadDto): Promise<Leads> {
    try {
      return await this.leadsModel.findByIdAndUpdate(id, updateLeadDto, {
        new: true,
      });
    } catch (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }
  }
  async listLeads(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    // Build search filter
    const filter: any = search
      ? {
          $or: [
            { name: new RegExp(search, 'i') }, // case-insensitive search by name
            { email: new RegExp(search, 'i') }, // case-insensitive search by email
            { source: new RegExp(search, 'i') }, // case-insensitive search by source
          ],
        }
      : {};

    // Handle Date Range
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: moment(new Date(startDate)).startOf('day').toDate(),
        $lte: moment(new Date(endDate)).endOf('day').toDate(),
      };
    }
    console.log(filter);
    const [leads, total] = await Promise.all([
      this.leadsModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.leadsModel.countDocuments(filter).exec(),
    ]);
    return {
      list: leads,
      count: total,
      currentPage: page,
      totalPages: Math.ceil(total / Number(limit)),
    };
  }
  async deleteLead(leadId) {
    try {
      const leadData = await this.leadsModel.findById(leadId);
      console.log({ leadData });
      console.log(leadData?.email, leadData?.mobile_number);
      if (leadData?.email || leadData?.mobile_number) {
        if (leadData?.email) {
          console.log({ customereemail: leadData?.email });

          const customerCheckEmail = await this.customerModel.findOne({
            email: leadData?.email,
            user_register_flag: 'user_not_verified',
            source: 'leads',
          });
          console.log({ customerCheckEmail });
          if (customerCheckEmail) {
            console.log(
              `Deleted customer ${customerCheckEmail._id} by`,
              leadData?.email,
              leadData?.mobile_number,
            );
            await this.customerModel.findByIdAndDelete(customerCheckEmail._id);
          }
        }

        if (leadData?.mobile_number) {
          console.log({ customere: leadData?.mobile_number });
          const customerCheckMobile = await this.customerModel.findOne({
            $or: [
              { mobile_number: leadData?.mobile_number },
              { whatsapp_number: leadData?.mobile_number },
            ],
            user_register_flag: 'user_not_verified',
            source: 'leads',
          });
          console.log({ customerCheckMobile });
          if (customerCheckMobile) {
            console.log(
              `Deleted customer ${customerCheckMobile._id} by`,
              leadData?.email,
              leadData?.mobile_number,
            );
            await this.customerModel.findByIdAndDelete(customerCheckMobile._id);
          }
        }
      }

      await this.leadsModel.findByIdAndDelete(leadId);

      return;
    } catch (error) {
      throw new Error(`Failed to retrieve Leads: ${error.message}`);
    }
  }
  async leadsDetails(id: string) {
    const result = await this.leadsModel.findById(id);
    return result;
  }
}
