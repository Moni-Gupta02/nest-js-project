// src/common/schemas/olduser.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OldUserSchema } from './schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: OldUserSchema }]),
  ],
  exports: [MongooseModule],
})
export class CommonModule {}
