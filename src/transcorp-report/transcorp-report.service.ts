import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
const moment = require('moment');
import { groupObjectsByAddressSimilarity } from './transcorp-report.helper';

@Injectable()
export class TranscorpReportService {
  constructor(
    @InjectModel('AWB')
    private readonly awbModel: Model<any>,
  ) { }

  async pickTranscorpReport(query: {
    date: string;
    type: string;
    vendor: string;
  }) {
    const preparedData = await this.getPreparedTranscorpData(query);
    const { phase, deliveryOwn } = this.getPhaseAndDeliveryOwn(query.type);

    const groupedObjects = groupObjectsByAddressSimilarity(
      preparedData.transCorpPayload,
      0.9,
      phase,
      deliveryOwn,
    );

    return {
      true: 'success',
      data: preparedData.rawData,
      count: preparedData.count,
      groups: groupedObjects.groups,
      matchedGroups: groupedObjects.matchedGroups,
      unmatchedGroups: groupedObjects.unmatchedGroups,
      csvPayload: groupedObjects.csvPayload,
    };
  }

  async generateCsv(query: {
    date: string;
    type: string;
    vendor: string;
  }) {
    const preparedData = await this.getPreparedTranscorpData(query);
    const { phase, deliveryOwn } = this.getPhaseAndDeliveryOwn(query.type);

    const groupedObjects = groupObjectsByAddressSimilarity(
      preparedData.transCorpPayload,
      0.9,
      phase,
      deliveryOwn,
    );

    return {
      true: 'success',
      count: preparedData.count,
      csvPayload: groupedObjects.csvPayload,
      groups: groupedObjects.groups,
    };
  }

  async mergeAllAddress(body: {
    date: string;
    type: string;
    vendor: string;
  }) {
    const preparedData = await this.getPreparedTranscorpData(body);
    const { phase, deliveryOwn } = this.getPhaseAndDeliveryOwn(body.type);

    const groupedObjects = groupObjectsByAddressSimilarity(
      preparedData.transCorpPayload,
      1,
      phase,
      deliveryOwn,
    );

    const mergeAllPayload = groupedObjects.groups.filter(
      (group) => group.length >= 2,
    );

    if (!mergeAllPayload.length) {
      return {
        true: 'success',
        message:
          'All 100% matched addresses have been merged before. No addresses left to merge.',
        mergedCount: 0,
        groups: groupedObjects.groups,
      };
    }

    const finalMergeData: any[][] = [];

    for (const mergableData of mergeAllPayload) {
      const timeSlot: Record<string, any[]> = {};

      for (const item of mergableData) {
        if (!item?.slot) continue;

        if (!timeSlot[item.slot]) {
          timeSlot[item.slot] = [];
        }

        timeSlot[item.slot].push(item);
      }

      for (const slot in timeSlot) {
        if (timeSlot[slot]?.length >= 2) {
          finalMergeData.push(timeSlot[slot]);
        }
      }
    }

    if (!finalMergeData.length) {
      return {
        true: 'success',
        message:
          'All 100% matched addresses have been merged before. No addresses left to merge.',
        mergedCount: 0,
        groups: groupedObjects.groups,
      };
    }

    for (const mergeGroup of finalMergeData) {
      await this.mergeTranscorpGroup(mergeGroup, {
        type: body.type,
      });
    }

    const afterMergeData = await this.pickTranscorpReport({
      date: body.date,
      type: body.type,
      vendor: body.vendor,
    });

    return {
      true: 'success',
      message: 'Addresses have been successfully merged.',
      mergedCount: finalMergeData.length,
      count: afterMergeData.count,
      groups: afterMergeData.groups,
      csvPayload: afterMergeData.csvPayload,
    };
  }

  async mergeAddress(body: {
    date: string;
    type: string;
    vendor: string;
    awbs: string[];
  }) {
    if (!body.awbs || !Array.isArray(body.awbs) || body.awbs.length < 2) {
      throw new BadRequestException('At least 2 AWBs are required for merge');
    }

    const type = body.type.toLowerCase();

    const awbRecords = await this.awbModel
      .find({
        awb: { $in: body.awbs },
        type,
        active: true,
      })
      .lean();

    const foundAwbs = awbRecords.map((item: any) => item.awb);

    const missingAwbs = body.awbs.filter(
      (awb) => !foundAwbs.includes(awb),
    );

    if (missingAwbs.length) {
      const inactiveMergedAwbs = await this.awbModel
        .find({
          awb: { $in: missingAwbs },
          type,
          active: false,
        })
        .select({
          awb: 1,
          'refund_bag_details.otherAwb': 1,
        })
        .lean();

      if (inactiveMergedAwbs.length) {
        throw new BadRequestException(
          `AWB already merged or inactive: ${inactiveMergedAwbs
            .map((item: any) => item.awb)
            .join(', ')}`,
        );
      }

      throw new BadRequestException(
        `AWB not found: ${missingAwbs.join(', ')}`,
      );
    }

    if (awbRecords.length < 2) {
      throw new BadRequestException('Valid active AWB records not found');
    }

    const sortedMergeGroup = body.awbs
      .map((awb) => awbRecords.find((record: any) => record.awb === awb))
      .filter(Boolean)
      .map((record: any) => ({
        awb: record.awb,
        ...record.refund_bag_details,
      }));

    for (let i = 0; i < sortedMergeGroup.length; i++) {
      for (let j = i + 1; j < sortedMergeGroup.length; j++) {
        const firstItem = sortedMergeGroup[i];
        const secondItem = sortedMergeGroup[j];

        if (
          firstItem?.after_time?.toString() !== secondItem?.after_time?.toString() ||
          firstItem?.before_time?.toString() !== secondItem?.before_time?.toString()
        ) {
          throw new BadRequestException(
            `${firstItem?.customer_name} time slot doesn't match with ${secondItem?.customer_name}`,
          );
        }
      }
    }

    await this.mergeTranscorpGroup(sortedMergeGroup, {
      type,
    });

    const afterMergeData = await this.pickTranscorpReport({
      date: body.date,
      type,
      vendor: body.vendor?.toLowerCase() || 'transcorp',
    });

    return {
      true: 'success',
      message: 'Addresses have been successfully merged.',
      count: afterMergeData.count,
      groups: afterMergeData.groups,
      csvPayload: afterMergeData.csvPayload,
    };
  }

  async unmergeAddress(body: {
    date: string;
    type: string;
    vendor: string;
    awbs: string[];
  }) {
    if (!body.awbs || !Array.isArray(body.awbs) || body.awbs.length < 1) {
      throw new BadRequestException('At least 1 AWB is required for unmerge');
    }

    const returnArrayOfAWB: any[] = [];
    const awbArray: any[] = [];

    for (const awb of body.awbs) {
      const parentAwbData: any = await this.awbModel
        .findOne(
          {
            awb,
            type: body.type,
            vendor: body.vendor,
            active: true,
          },
          {
            refund_bag_details: 1,
            awb: 1,
          },
        )
        .lean();

      if (!parentAwbData?.refund_bag_details) {
        continue;
      }

      const refundBagDetails = parentAwbData.refund_bag_details;
      const otherAwbs = refundBagDetails?.otherAwb || [];

      if (!otherAwbs.length) {
        continue;
      }

      awbArray.push([awb, ...otherAwbs]);

      let remainingPackage = 0;
      const otherCustomersIds: any[] = [];

      for (const otherAwb of otherAwbs) {
        const updatedOtherAwb: any = await this.awbModel.findOneAndUpdate(
          {
            awb: otherAwb,
            type: body.type,
            vendor: body.vendor,
          },
          {
            $set: {
              active: true,
            },
          },
          {
            new: true,
          },
        );

        if (updatedOtherAwb?.refund_bag_details) {
          returnArrayOfAWB.push(updatedOtherAwb.refund_bag_details);

          otherCustomersIds.push({
            customer_id: updatedOtherAwb.refund_bag_details.customer_id,
            order_id: updatedOtherAwb.refund_bag_details.order_id,
            delivery_id: updatedOtherAwb.refund_bag_details.delivery_id,
          });

          remainingPackage += parseInt(
            updatedOtherAwb.refund_bag_details.no_of_package || 0,
          );
        }
      }

      const separateCustomerName =
        refundBagDetails?.customer_name?.split('/') || [];

      const separateOrderNumber =
        refundBagDetails?.order_number?.split(' & ') || [];

      const separateCustomerCode =
        refundBagDetails?.internal_code?.split(' & ') || [];

      const customerDetails = refundBagDetails?.customerDetails || [];

      for (const custIds of otherCustomersIds) {
        const indexOfCustomerDetails = customerDetails.findIndex(
          (cusData: any) =>
            String(cusData?.customer_id) === String(custIds?.customer_id) &&
            String(cusData?.order_id) === String(custIds?.order_id) &&
            String(cusData?.delivery_id) === String(custIds?.delivery_id),
        );

        if (indexOfCustomerDetails !== -1) {
          customerDetails.splice(indexOfCustomerDetails, 1);
        }
      }

      const updatedFirstAwb: any = await this.awbModel.findOneAndUpdate(
        {
          awb,
          type: body.type,
          vendor: body.vendor,
        },
        {
          $set: {
            'refund_bag_details.customer_name':
              separateCustomerName[0] || refundBagDetails.customer_name,

            'refund_bag_details.order_number':
              separateOrderNumber[0] || refundBagDetails.order_number,

            'refund_bag_details.internal_code':
              body.type === 'bag_pick'
                ? refundBagDetails.internal_code
                : separateCustomerCode[0] || refundBagDetails.internal_code,

            'refund_bag_details.no_of_package':
              parseInt(refundBagDetails?.no_of_package || 0) -
              parseInt(String(remainingPackage || 0)),

            'refund_bag_details.otherAwb': [],

            'refund_bag_details.customerDetails': customerDetails || [],
          },
        },
        {
          new: true,
        },
      );

      if (updatedFirstAwb?.refund_bag_details) {
        returnArrayOfAWB.push(updatedFirstAwb.refund_bag_details);
      }
    }

    const afterUnmergeData = await this.pickTranscorpReport({
      date: body.date,
      type: body.type,
      vendor: body.vendor,
    });

    return {
      true: 'success',
      message: 'Addresses have been successfully unmerged.',
      awbArray,
      returnArrayOfAWB,
      count: afterUnmergeData.count,
      groups: afterUnmergeData.groups,
      csvPayload: afterUnmergeData.csvPayload,
    };
  }

  async finalizeDriversCode(query: {
    date: string;
    type: string;
    vendor?: string;
  }) {
    try {
      if (!query.date) {
        throw new BadRequestException('date is required');
      }

      if (!query.type) {
        throw new BadRequestException('type is required');
      }

      const type = query.type.toLowerCase();
      const vendor = query.vendor?.toLowerCase() || 'own';

      const startDate = new Date(
        moment(new Date(query.date))
          .startOf('day')
          .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
      );

      const endDate = new Date(
        moment(new Date(query.date))
          .endOf('day')
          .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
      );

      let extraQuery: any = {};

      if (type === 'mp') {
        extraQuery = {
          $or: [{ type: 'mp' }, { type: 'bag_pick' }],
        };
      } else if (type === 'ndd') {
        extraQuery = {
          type: 'ndd',
        };
      } else if (type === 'bag_pick') {
        extraQuery = {
          type: 'bag_pick',
        };
      } else {
        extraQuery = {
          type,
        };
      }

      const commonFilter = {
        transcorp_date: {
          $gte: startDate,
          $lte: endDate,
        },
        active: true,
        vendor,
        ...extraQuery,
      };

      /*
        CHECK IF AWB EXISTS
      */

      const totalAwbCount = await this.awbModel.countDocuments(commonFilter);

      if (totalAwbCount === 0) {
        throw new BadRequestException(
          'No active AWBs found for selected date and type',
        );
      }

      /*
        CHECK IF ALREADY FINALIZED
      */

      const alreadyUnfinalizedCount = await this.awbModel.countDocuments({
        ...commonFilter,
        is_finalized: false,
      });

      if (alreadyUnfinalizedCount === 0) {
        return {
          true: 'success',
          alreadyFinalized: true,
          message: 'AWBs already finalized.',
          totalAwbCount,
          unfinalizedCount: 0,
        };
      }

      /*
        FINALIZE ACTIVE AWBS
      */

      const updateAwbActive = await this.awbModel.updateMany(
        commonFilter,
        {
          $set: {
            is_finalized: true,
          },
        },
      );

      /*
        REMOVE FINALIZED FROM INACTIVE AWBS
      */

      const updateAwbInactive = await this.awbModel.updateMany(
        {
          transcorp_date: {
            $gte: startDate,
            $lte: endDate,
          },
          active: false,
          vendor,
          type,
        },
        {
          $set: {
            is_finalized: false,
          },
        },
      );

      /*
        FINAL VALIDATION
      */

      const unfinalizedCount = await this.awbModel.countDocuments({
        ...commonFilter,
        is_finalized: false,
      });

      return {
        true: 'success',
        alreadyFinalized: false,
        message: 'Drivers AWB finalized successfully.',
        totalAwbCount,
        finalizedActiveCount: updateAwbActive.modifiedCount || 0,
        unfinalizedInactiveCount:
          updateAwbInactive.modifiedCount || 0,
        unfinalizedCount,
      };
    } catch (error: any) {
      console.log('FINALIZE DRIVERS CODE ERROR:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error?.message || 'Failed to finalize drivers code',
      );
    }
  }

  private async getPreparedTranscorpData(query: {
    date: string;
    type: string;
    vendor: string;
  }) {
    if (!query.date) {
      throw new BadRequestException('date is required');
    }

    if (!query.type) {
      throw new BadRequestException('type is required');
    }

    if (!query.vendor) {
      throw new BadRequestException('vendor is required');
    }

    const date = new Date(
      moment(new Date(query.date))
        .startOf('day')
        .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
    );

    const filter = {
      transcorp_date: date,
      type: query.type,
      active: true,
      vendor: query.vendor,
    };

    const rawData = await this.awbModel.find(filter).populate({
      path: 'refund_bag_details.order_id',
      model: 'Orders',
    });

    const count = await this.awbModel.countDocuments(filter);

    const selectedDate = moment(new Date(query.date)).format('YYYY-MM-DD');

    const transCorpPayload = rawData.map((item: any) => {
      const refundBagDetails = item?.refund_bag_details || {};
      const orderData = refundBagDetails?.order_id;

      let typeOfOrder = '';

      if (orderData) {
        typeOfOrder = orderData.type_of_order === 'new' ? 'new' : 'renew';
      }

      let deliveryStatus = '';

      const deliveryStartDate = orderData?.order_item?.[0]?.delivery_start_date;

      if (deliveryStartDate) {
        const orderDeliveryDate = moment(deliveryStartDate).format(
          'YYYY-MM-DD',
        );

        if (orderDeliveryDate === selectedDate) {
          deliveryStatus = 'First Delivery';
        }
      }

      return {
        ...refundBagDetails,
        delivery_date: moment(new Date(query.date)).format('MM/DD/YYYY'),
        type_of_order: typeOfOrder,
        delivery_status: deliveryStatus,
        '35': typeOfOrder,
        '36': deliveryStatus,
      };
    });

    return {
      rawData,
      count,
      transCorpPayload,
    };
  }

  private async mergeTranscorpGroup(
    mergeGroup: any[],
    query: {
      type: string;
    },
  ) {
    if (!mergeGroup || mergeGroup.length < 2) {
      return;
    }

    const mergeData: any = {
      order_number: [],
      internal_code: [],
      no_of_package: 0,
      customer_name: [],
      otherAwb: [],
      customerDetails: [],
    };

    mergeGroup.forEach((item: any, index: number) => {
      mergeData.order_number.push(item?.order_number);
      mergeData.internal_code.push(item?.internal_code);
      mergeData.no_of_package += parseInt(item?.no_of_package || 0);
      mergeData.customer_name.push(item?.customer_name);

      mergeData.customerDetails.push({
        customer_id: item?.customer_id,
        customer_name: item?.customer_name,
        delivery_id: item?.delivery_id,
        order_id: item?.order_id,
        bag_opted: item?.bag_opted === 'Yes' ? true : false,
        bag_type: item?.bag_type,
      });

      if (index > 0) {
        mergeData.otherAwb.push(item?.awb);
      }
    });

    const mainAwb = mergeGroup[0]?.awb;

    if (!mainAwb) {
      return;
    }

    await this.awbModel.findOneAndUpdate(
      {
        awb: mainAwb,
        type: query.type,
      },
      {
        $set: {
          'refund_bag_details.order_number':
            mergeData.order_number.join(' & '),

          'refund_bag_details.internal_code':
            query.type === 'bag_pick'
              ? 'Pick'
              : mergeData.internal_code.join(' & '),

          'refund_bag_details.no_of_package': mergeData.no_of_package,

          'refund_bag_details.customer_name':
            mergeData.customer_name.join('/'),

          'refund_bag_details.otherAwb': mergeData.otherAwb,

          'refund_bag_details.customerDetails': mergeData.customerDetails,
        },
      },
    );

    const remainingAwbs = mergeGroup
      .slice(1)
      .map((item) => item?.awb)
      .filter(Boolean);

    if (remainingAwbs.length) {
      await this.awbModel.updateMany(
        {
          awb: { $in: remainingAwbs },
          type: query.type,
        },
        {
          $set: {
            active: false,
          },
        },
      );
    }
  }

  private getPhaseAndDeliveryOwn(type: string): {
    phase: string;
    deliveryOwn: string;
  } {
    if (type === 'ndd') {
      return {
        phase: 'NDD',
        deliveryOwn: 'Delivery',
      };
    }

    if (type === 'mp') {
      return {
        phase: 'MP',
        deliveryOwn: 'Delivery',
      };
    }

    if (type === 'bag_pick') {
      return {
        phase: 'PICK',
        deliveryOwn: 'Pickup',
      };
    }

    return {
      phase: 'PICK',
      deliveryOwn: 'Delivery',
    };
  }

  async downloadAfterMergeCsv(query: {
    date: string;
    type: string;
    vendor: string;
  }) {
    const preparedData = await this.getPreparedTranscorpData(query);
    const { phase, deliveryOwn } = this.getPhaseAndDeliveryOwn(query.type);

    const groupedObjects = groupObjectsByAddressSimilarity(
      preparedData.transCorpPayload,
      0.9,
      phase,
      deliveryOwn,
    );

    return this.convertTranscorpPayloadToCsv(groupedObjects.csvPayload);
  }

  async downloadUnmergedCsv(query: {
    date: string;
    type: string;
    vendor: string;
  }) {
    const preparedData = await this.getPreparedTranscorpData(query);
    const { phase, deliveryOwn } = this.getPhaseAndDeliveryOwn(query.type);

    const groupedObjects = groupObjectsByAddressSimilarity(
      preparedData.transCorpPayload,
      0.9,
      phase,
      deliveryOwn,
    );

    return this.convertTranscorpPayloadToCsv(groupedObjects.csvPayload);
  }
  private convertTranscorpPayloadToCsv(csvPayload: any[]) {
    const headers = [
      'Merchant',
      'Delivery Date',
      'After Time',
      'Before Time',
      'Delivery Mode',
      'Delivery Type',
      'Details',
      'Notes',
      'COD',
      'Order Number',
      'AWB',
      'Shipment Packages',
      'Quantity',
      'Weight',
      'Volume',
      'SMS',
      'Consignee Name',
      'Phone',
      'Address',
      'District',
      'City',
      'Country',
      'Consignee State',
      'Consignee ZIP Code',
      'Consignee Address Code',
      'Ship From Name',
      'Ship From Phone',
      'Ship From Address',
      'Ship From District',
      'Ship From City',
      'Ship From Country',
      'Ship From Latitude',
      'Ship From Longitude',
      'High Value Task',
      'Type of Order',
      'Delivery Status',
    ];

    const escapeCsvValue = (value: any) => {
      if (value === null || value === undefined) return '';

      const stringValue = String(value);

      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    const rows = csvPayload.map((item) => {
      return Array.from({ length: 36 }, (_, index) => {
        return escapeCsvValue(item[String(index + 1)]);
      }).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

}