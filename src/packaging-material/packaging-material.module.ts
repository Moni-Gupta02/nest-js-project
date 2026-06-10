import { Module } from '@nestjs/common';
import { PackagingMaterialService } from './packaging-material.service';
import { PackagingMaterialController } from './packaging-material.controller';
import { PackagingMaterialSchema } from './Schemas/packaging-material.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryService } from 'src/history/history.service';
import { HistorySchema } from 'src/history/Schemas/history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PackagingMaterial', schema: PackagingMaterialSchema },
      { name: 'History', schema: HistorySchema },
    ]),
  ],
  controllers: [PackagingMaterialController],
  providers: [PackagingMaterialService, HistoryService],
})
export class PackagingMaterialModule {}
