import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Unit } from 'convert';
import * as moment from 'moment-timezone';
import { Types } from 'mongoose';

type AsyncFunction = (...args: any[]) => Promise<any>;

export async function handleAsyncFunctionExecution(
  asyncFn: AsyncFunction,
): Promise<AsyncFunction> {
  return async (...args: any[]) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      console.log('Error:', error);
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  };
}

export function handleValidationError(error: ValidationError) {
  throw new HttpException(
    { message: 'Validation failed', errors: formatValidationErrors(error) },
    HttpStatus.BAD_REQUEST,
  );
}

export function handleUnexpectedError(error: Error) {
  throw new HttpException(
    { message: `Internal server error,${error}`, error: error.message },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

function formatValidationErrors(error: ValidationError): string[] {
  const validationErrors = [];
  for (const key in error.constraints) {
    if (error.constraints.hasOwnProperty(key)) {
      console.log(`${key}: ${error.constraints[key]}`);
      validationErrors.push({ key: error.constraints[key] });
    }
  }
  return validationErrors;
}

export function isMassUnit(unit: string): unit is Unit {
  const validMassUnits: Unit[] = ['kg', 'g', 'mg', 'tonne', 'lb', 'oz'];
  return validMassUnits.includes(unit as Unit);
}

export function isVolumeUnit(unit: string): unit is Unit {
  const volumeUnits: Unit[] = ['L', 'mL', 'm³', 'cm³', 'gal'];
  return volumeUnits.includes(unit as Unit);
}

export async function convertToObjectId(
  value: string | undefined,
): Promise<Types.ObjectId> {
  return value ? new Types.ObjectId(value) : null;
}
export const setRounded = (number: number) => {
  // return parseFloat(Number(number) * 100) / 100;
  return parseFloat(Number(number).toFixed(2));
};

export const getBetweenDay = async (date: string | Date) => {
  try {
    const formattedDate = moment(date, 'MM/DD/YYYY').toDate();
    const startDate = new Date(
      moment(formattedDate).utcOffset(0, true).startOf('day').toDate(),
    );
    const endDate = new Date(
      moment(formattedDate).utcOffset(0, true).endOf('day').toDate(),
    );

    return {
      $gte: startDate,
      $lte: endDate,
    };
  } catch (error) {
    console.log('catch Error--------------->', error);
    throw error; // Optionally rethrow the error for handling further up the call stack
  }
};
