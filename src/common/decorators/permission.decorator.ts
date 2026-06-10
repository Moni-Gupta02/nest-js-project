import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (
  ...permissions: { resource: string; actions: string }[]
) => SetMetadata(PERMISSIONS_KEY, permissions);
