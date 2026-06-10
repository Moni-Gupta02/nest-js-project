import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DeliveryLocation {
  @Prop({ required: true })
  location_name: string;

  @Prop()
  header: string;

  @Prop()
  testimonial_title: string;

  @Prop()
  testimonial_description: string;

  @Prop()
  testimonial_by: string;

  @Prop()
  card_title: string;

  @Prop()
  card_description: string;
  @ApiProperty({
    description: 'FAQs related to the service',
    example: [
      {
        _id: '1',
        question: 'What services do you offer?',
        answer: 'We offer a variety of meal plans.',
      },
    ],
  })
  @Prop()
  faqs: Array<{ _id: string; question: string; answer: string }>;

  @ApiProperty({
    description: 'Slug for the URL',
    example: 'individual-services',
  })
  @Prop({ type: String })
  slug: string;
}

export type DeliveryLocationDocument = DeliveryLocation & Document;
export const DeliveryLocationSchema =
  SchemaFactory.createForClass(DeliveryLocation);
