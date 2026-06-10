import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from 'src/common/decorators';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { Model } from 'mongoose';
import { OldUserDocument } from '../schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
  extractBearerTokenFromRequest,
  normalizeAuthorizationHeader,
} from '../utils/auth-token.util';

import { verifyKitchenJwt } from '../jwt/verify-kitchen-jwt';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private authService: AuthService,
    @InjectModel('User')
    private readonly oldUser: Model<OldUserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerTokenFromRequest(request);
    if (!token) {
      throw new UnauthorizedException({
        status: false,
        message:
          'Missing auth token. Local: `Authorization: Bearer <token>`. Staging (staging-rms-api.delicut.ae): use `access-token: Bearer <token>` — do not send `Authorization` (nginx blocks it).',
      });
    }

    normalizeAuthorizationHeader(request, token);

    let payload: { email: string; _id?: string; role?: string };
    try {
      payload = verifyKitchenJwt(token) as { email: any };
      console.log('payload', payload);
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException({
        status: false,
        message: 'Invalid or expired session. Please sign in again.',
      });
    }

    const authHeader = String(request.headers.authorization ?? '');
    if (!authHeader.startsWith('Bearer ')) {
      const adminUserExist = await this.oldUser.findOne({
        email: payload.email,
      });
      if (!adminUserExist) {
        throw new UnauthorizedException();
      }
      return true;
    }

    const requiredPermissions = this.reflector.get<
      { resource: string; actions: string }[]
    >('permissions', context.getHandler());

    if (
      requiredPermissions?.some(
        (permission) =>
          permission.resource === 'public' && permission.actions === 'read',
      )
    ) {
      return true;
    }

    if (!requiredPermissions) {
      return true;
    }

    const user = request['user'];
    const role = await this.authService.findRoleByName(user._id);
    if (!role) {
      throw new ForbiddenException('Role not found');
    }
    if (role.role === 'master_admin') {
      return true;
    }

    if (!role.permissions) {
      throw new ForbiddenException('Permissions not found for the role');
    }

    const hasPermission = requiredPermissions.some(({ resource, actions }) => {
      const permission = role.permissions.find((p) => p.resource == resource);
      return permission && permission.actions.includes(actions);
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
