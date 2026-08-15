import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as { message: string }).message;
      code = HttpStatus[status] ?? 'HTTP_ERROR';
    } else if (exception instanceof DomainException) {
      status = this.mapDomainCode(exception.code);
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error({ err: exception, status, code }, message);

    response.status(status).json({ statusCode: status, message, code });
  }

  private mapDomainCode(code: string): number {
    switch (code) {
      case 'NOT_FOUND':
        return HttpStatus.NOT_FOUND;
      case 'CONFLICT':
        return HttpStatus.CONFLICT;
      case 'FORBIDDEN':
        return HttpStatus.FORBIDDEN;
      case 'UNAUTHORIZED':
        return HttpStatus.UNAUTHORIZED;
      case 'VALIDATION_ERROR':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }
}
