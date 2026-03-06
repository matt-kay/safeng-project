import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  VTPASS_BASE_URL_STAGING,
  VTPASS_BASE_URL_PROD,
  VTPassEndpoints,
} from './vtpass.constants';
import {
  parseVTPassError,
  VTPASS_STATUS_CODES,
  VTPassException,
} from './vtpass.errors';

@Injectable()
export class VTPassService {
  private readonly logger = new Logger(VTPassService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly publicKey: string;
  private readonly secretKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const overrideUrl = this.configService.get<string>('VTPASS_BASE_URL');

    this.baseUrl =
      overrideUrl || (isProd ? VTPASS_BASE_URL_PROD : VTPASS_BASE_URL_STAGING);
    this.apiKey = this.configService.get<string>('VTPASS_API_KEY') || '';
    this.publicKey = this.configService.get<string>('VTPASS_PUBLIC_KEY') || '';
    this.secretKey = this.configService.get<string>('VTPASS_SECRET_KEY') || '';

    if (!this.apiKey || !this.publicKey || !this.secretKey) {
      this.logger.warn(
        'VTpass API keys are not fully configured in environment variables',
      );
    }
  }

  private getHeaders(method: 'GET' | 'POST') {
    const headers: any = {
      'api-key': this.apiKey,
    };

    if (method === 'GET') {
      headers['public-key'] = this.publicKey;
    } else {
      headers['Content-Type'] = 'application/json';
      headers['secret-key'] = this.secretKey;
    }

    return headers;
  }

  async getVariationCodes(serviceId: string): Promise<any> {
    return this.makeRequest(
      'GET',
      `${VTPassEndpoints.VARIATION_CODES}?serviceID=${serviceId}`,
    );
  }

  async verifyMerchant(
    serviceId: string,
    billerCode: string,
    type?: string,
  ): Promise<any> {
    const payload: any = {
      serviceID: serviceId,
      billersCode: billerCode,
    };
    if (type) {
      payload.type = type;
    }
    return this.makeRequest('POST', VTPassEndpoints.MERCHANT_VERIFY, payload);
  }

  async pay(payload: {
    request_id: string;
    serviceID: string;
    billersCode: string;
    variation_code?: string;
    amount?: number;
    phone: string;
    subscription_type?: string;
  }): Promise<any> {
    return this.makeRequest('POST', VTPassEndpoints.PAY, payload);
  }

  async requeryTransaction(requestId: string): Promise<any> {
    return this.makeRequest('POST', VTPassEndpoints.STATUS, {
      request_id: requestId,
    });
  }

  async getWalletBalance(): Promise<any> {
    return this.makeRequest('GET', VTPassEndpoints.BALANCE);
  }

  getEnvironment(): string {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    return isProd ? 'Live' : 'Sandbox';
  }

  private async makeRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const request$ =
        method === 'GET'
          ? this.httpService.get(url, { headers: this.getHeaders(method) })
          : this.httpService.post(url, data, { headers: this.getHeaders(method) });

      const response = await lastValueFrom(request$);

      const responseData = response.data;
      const statusCode = String(responseData.code || responseData.response_description || '');

      const isSuccess =
        statusCode === VTPASS_STATUS_CODES.SUCCESS ||
        statusCode === VTPASS_STATUS_CODES.PENDING ||
        statusCode === VTPASS_STATUS_CODES.BALANCE_SUCCESS;

      if (!isSuccess) {
        throw parseVTPassError(responseData);
      }

      return responseData;
    } catch (error: any) {
      // Extract raw response for logging
      const errorResponse = error.rawResponse || error.response?.data;

      this.logger.error(
        `VTpass Request Failed at ${endpoint}: ${error.message}. Raw Response: ${JSON.stringify(errorResponse)}`,
        error.stack,
      );

      if (error instanceof VTPassException) {
        throw error;
      }

      if (error.response) {
        throw parseVTPassError(error.response.data);
      }

      // Network or other generic error
      throw parseVTPassError({
        code: 'NETWORK_ERROR',
        response_description: error.message,
      });
    }
  }
}
