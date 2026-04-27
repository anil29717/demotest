import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest<{ method?: string; url?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const method = req?.method ?? 'UNKNOWN';
    const url = req?.url ?? 'unknown';
    if (status >= 500) {
      this.logger.error(`[HTTP] ${method} ${url} -> ${status}`);
      Sentry.captureException(exception);
    } else if (status >= 400) {
      this.logger.warn(`[HTTP] ${method} ${url} -> ${status}`);
    }

    res.status(status).json(payload);
  }
}
