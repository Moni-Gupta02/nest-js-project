import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ServiceApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ServiceApiKeyGuard.name);

  canActivate(ctx: ExecutionContext): boolean {
    const expected = process.env.MOLT_SERVICE_KEY;
    if (!expected) {
      this.logger.warn('MOLT_SERVICE_KEY env var not set — service endpoint is locked');
      throw new ServiceUnavailableException('Service key not configured');
    }

    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-service-key'];
    if (!key || key !== expected) {
      throw new UnauthorizedException('Invalid service key');
    }
    return true;
  }
}
