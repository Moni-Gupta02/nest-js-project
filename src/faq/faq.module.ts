import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FAQSchema } from './Schemas/faq.schema';
import { FAQCategorySchema } from './Schemas/faqCategory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'faqs', schema: FAQSchema },
      { name: 'faq_categories', schema: FAQCategorySchema },
    ]),
  ],
  controllers: [FaqController],
  providers: [FaqService],
})
export class FaqModule {}
