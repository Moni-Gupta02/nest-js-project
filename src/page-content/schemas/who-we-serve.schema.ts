import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

export type WhoWeServeDocument = WhoWeServe & Document;

@Schema({ timestamps: true })
export class WhoWeServe {
  @ApiProperty({ description: 'People category', example: 'Individuals' })
  @Prop({ type: String })
  people: string;

  @ApiProperty({
    description: 'Header of the section',
    example: 'Who we serve',
  })
  @Prop({ type: String })
  header: string;

  @ApiProperty({
    description: 'Testimonial title',
    example: 'What our clients say',
  })
  @Prop({ type: String })
  testimonial_title: string;

  @ApiProperty({
    description: 'Testimonial description',
    example: 'We serve various people with great food.',
  })
  @Prop({ type: String })
  testimonial_description: string;

  @ApiProperty({ description: 'Testimonial author', example: 'John Doe' })
  @Prop({ type: String })
  testimonial_by: string;

  @ApiProperty({ description: 'Card title', example: 'Our Services' })
  @Prop({ type: String })
  card_title: string;

  @ApiProperty({
    description: 'Card description',
    example: 'We offer a wide range of services.',
  })
  @Prop({ type: String })
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

export const WhoWeServeSchema = SchemaFactory.createForClass(WhoWeServe);
