import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx        = host.switchToHttp();
    const response   = ctx.getResponse<Response>();
    const request    = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();
    const exResponse = exception.getResponse();

    const message =
      typeof exResponse === 'string'
        ? exResponse
        : (exResponse as any)?.message ?? exception.message;

    const error =
      typeof exResponse === 'object'
        ? (exResponse as any)?.error ?? exception.name
        : exception.name;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} → ${statusCode}`, exception.stack);
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${statusCode}: ${JSON.stringify(message)}`);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      path:      request.url,
      timestamp: new Date().toISOString(),
    });
  }
}