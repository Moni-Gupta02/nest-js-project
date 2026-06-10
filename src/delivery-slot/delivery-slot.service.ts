import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeliverySlotDocument } from './schemas/delivery-slot.schema';
import { Model } from 'mongoose';

@Injectable()
export class DeliverySlotService {
  constructor(
    @InjectModel('delivery_slots')
    private readonly deliverySlotModel: Model<DeliverySlotDocument>,
  ) {}
  async getDeliverySlots(cityName: string, province: string): Promise<any> {
    try {
      // Fetch delivery slots based on the city name
      const deliverySlotData = await this.deliverySlotModel.findOne({
        city_name: cityName,
      });

      if (!deliverySlotData) {
        return { slots: [], message: 'No delivery slots found for the city' };
      }

      // Filter areas by the provided province
      const filteredAreas = deliverySlotData.areas.filter(
        (area) => area.area === province,
      );

      if (!filteredAreas.length) {
        return {
          slots: [],
          message: 'No delivery slots found for the specified province',
        };
      }

      // Format response data
      const areas = filteredAreas.map((area) => ({
        slots: area.slot_list.map((slot) => ({
          label: slot.timing,
          value: slot.timing,
        })),
      }));

      return areas;
    } catch (error) {
      console.error('Error fetching delivery slots:', error);
      throw new Error('Failed to fetch delivery slots');
    }
  }
}
