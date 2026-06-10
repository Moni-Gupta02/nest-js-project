import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LoggerDocument = Logger & Document;

@Schema({ collection: 'logger', timestamps: true })
export class Logger {
  @Prop()
  level: string;

  @Prop()
  timestamp: Date;

  @Prop()
  message: string;

  @Prop({
    type: {
      req: {
        query: {
          originalUrl: { type: String },
        },
      },
      res: {
        body: { type: String },
      },
      responseTime: { type: Number },
      statusCode: { type: Number },
      rateLimit: {
        limit: { type: Number },
        current: { type: Number },
        remaining: { type: Number },
        resetTime: { type: Date },
      },
      requestMethod: { type: String },
      clientIp: { type: String },
      requestUrl: { type: String },
      protocol: { type: String },
      remoteIp: { type: String },
      requestSize: { type: Number },
      userAgent: { type: String },
      referrer: { type: String },
    },
  })
  meta: Record<string, any>;
}

export const LoggerSchema = SchemaFactory.createForClass(Logger);
