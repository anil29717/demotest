import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiProductService } from './api-product.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiProduct: ApiProductService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      apiConsumer?: { apiKeyId: string; userId: string };
    }>();
    const header = req.headers['x-api-key'];
    const rawKey = Array.isArray(header) ? header[0] : header;
    if (!rawKey) return false;
    const valid = await this.apiProduct.validateAndConsume(rawKey);
    if (!valid) return false;
    req.apiConsumer = { apiKeyId: valid.id, userId: valid.userId };
    return true;
  }
}
