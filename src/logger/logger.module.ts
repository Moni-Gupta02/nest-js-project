import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggerController } from './logger.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerSchema } from './Schemas/logger.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'logger', schema: LoggerSchema }]),
  ],

  controllers: [LoggerController],
  providers: [LoggerService],
})
export class LoggerModule {}
