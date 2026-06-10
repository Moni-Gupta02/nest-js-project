import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesService } from './roles.service';
import { PermissionsSchema } from './Schemas/roles.schema';
import { RolesController } from './roles.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Permissions', schema: PermissionsSchema },
    ]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService], // Optionally export RolesService if needed
})
export class RolesModule {}
