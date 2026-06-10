import { HttpException, HttpStatus } from '@nestjs/common';

export class DeliveryNotFoundException extends HttpException {
  constructor(date: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `No delivery data found for date: ${date}`,
        error: 'Delivery Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidDateException extends HttpException {
  constructor(date: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Invalid date format: ${date}`,
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DatabaseException extends HttpException {
  constructor(operation: string, error: any) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Database operation failed: ${operation}`,
        error: 'Internal Server Error',
        details: error.message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
