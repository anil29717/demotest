import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      user?: { role?: string };
    }>();
    const sourceHeader = req.headers?.['x-api-source'];
    const source = Array.isArray(sourceHeader) ? sourceHeader[0] : sourceHeader;
    if (source === 'crawler') return true;
    if (req.user?.role === 'ADMIN') return true;
    return super.canActivate(context);
  }
}
