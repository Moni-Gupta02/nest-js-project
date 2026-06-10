// src/manual-operations/exceptions/manual-operations.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthenticationFailedException extends HttpException {
  constructor(message = 'Failed to authenticate customer') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class CartNotFoundException extends HttpException {
  constructor(customerId: string) {
    super(`No cart found for customer ID: ${customerId}`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidCartStatusException extends HttpException {
  constructor(cartStatus: string) {
    super(
      `Cart is not ready for order creation. Current status: ${cartStatus}. Expected status: Completed`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OrderCreationFailedException extends HttpException {
  constructor(message = 'Failed to create order') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class DeliveryDateValidationException extends HttpException {
  constructor(message = 'Invalid delivery date proposed') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class DeliveryStartDateUpdateException extends HttpException {
  constructor(message = 'Failed to update delivery start date') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class CartNotCompletedException extends HttpException {
  constructor(cartId: string, cartStatus: string) {
    super(
      `Cannot update delivery date. Cart with ID: ${cartId} is not completed. Current status: ${cartStatus}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DeliveryDateUpdateFailedException extends HttpException {
  constructor(message = 'Failed to update delivery date') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class InvalidDeliveryDateException extends HttpException {
  constructor(message = 'Failed to validate delivery date') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
