import { HttpException, HttpStatus } from '@nestjs/common';

export class VTPassException extends HttpException {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly rawResponse?: any,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `VTpass Error: ${message}`,
        error: code,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export const VTPASS_STATUS_CODES = {
  SUCCESS: '000',
  BALANCE_SUCCESS: '1',  // Balance API uses 1
  PENDING: '099',
  INVALID_ARGUMENTS: '010',
  RECORD_NOT_FOUND: '011',
  INSUFFICIENT_BALANCE: '016',
  TRANSACTION_FAILED: '018',
  FATAL_ERROR: '083',
  SYSTEM_ERROR: '013',
};

export function parseVTPassError(response: any): VTPassException {
  const code = response?.code || 'UNKNOWN';
  const message =
    response?.response_description ||
    'An unknown error occurred with the provider';
  return new VTPassException(code, message, response);
}
