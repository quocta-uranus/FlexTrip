import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { IPaymentGateway, PaymentInitResult, WebhookVerifyResult } from './gateway.interface';

export interface PayOsWebhookPayload {
  code: string;
  desc: string;
  success: boolean;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId: string | null;
    counterAccountBankName: string | null;
    counterAccountName: string | null;
    counterAccountNumber: string | null;
    virtualAccountName: string | null;
    virtualAccountNumber: string | null;
  };
  signature: string;
}

@Injectable()
export class PayOsGateway implements IPaymentGateway {
  private readonly logger = new Logger(PayOsGateway.name);
  private readonly baseUrl = 'https://api-merchant.payos.vn';
  private readonly clientId: string;
  private readonly apiKey: string;
  private readonly checksumKey: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = config.get<string>('PAYOS_CLIENT_ID', '');
    this.apiKey = config.get<string>('PAYOS_API_KEY', '');
    this.checksumKey = config.get<string>('PAYOS_CHECKSUM_KEY', '');
  }

  async initiate(params: {
    orderCode: string;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    ipAddress?: string;
  }): Promise<PaymentInitResult> {
    // PayOS needs a unique integer; digits of our alphanumeric code collide (e.g. "1"), so use ms timestamp + 3 random digits
    const numericCode = Number(`${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);

    const body = {
      orderCode: numericCode,
      amount: Math.round(params.amount),
      description: params.description.substring(0, 25),
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
    };

    const signature = this.sign(body);
    const payload = { ...body, signature };

    this.logger.debug(`[PayOS] initiate orderCode=${numericCode}`);

    const res = await fetch(`${this.baseUrl}/v2/payment-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.clientId,
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json() as { code: string; desc: string; data?: { checkoutUrl: string } };
    if (json.code !== '00' || !json.data?.checkoutUrl) {
      this.logger.error(`[PayOS] initiate failed: ${json.code} ${json.desc}`);
      throw new Error(`PayOS error: ${json.code} — ${json.desc}`);
    }

    return { orderCode: String(numericCode), redirectUrl: json.data.checkoutUrl };
  }

  // Asks PayOS directly, so a caller cannot fake a "PAID" result
  async getPaymentStatus(orderCode: string): Promise<{ paid: boolean; transactionId: string; raw: unknown }> {
    const res = await fetch(`${this.baseUrl}/v2/payment-requests/${orderCode}`, {
      headers: { 'x-client-id': this.clientId, 'x-api-key': this.apiKey },
    });
    const json = await res.json() as {
      code: string;
      desc: string;
      data?: { status: string; transactions?: { reference?: string }[] };
    };
    if (json.code !== '00' || !json.data) {
      this.logger.error(`[PayOS] getPaymentStatus failed: ${json.code} ${json.desc}`);
      throw new Error(`PayOS error: ${json.code} — ${json.desc}`);
    }
    return {
      paid: json.data.status === 'PAID',
      transactionId: json.data.transactions?.[0]?.reference ?? `payos-${orderCode}`,
      raw: json,
    };
  }

  verifyWebhook(payload: Record<string, unknown>): WebhookVerifyResult {
    const { signature, data } = payload as unknown as PayOsWebhookPayload;
    const dataObj = data as Record<string, unknown>;

    const computed = this.signData(dataObj);
    const isValid = computed === signature;

    const success = isValid && payload['code'] === '00' && (payload['success'] === true || data?.code === '00');

    return {
      isValid,
      orderCode: String(data?.orderCode ?? ''),
      transactionId: data?.reference ?? '',
      amount: data?.amount ?? 0,
      success,
    };
  }

  // Verify a webhook body object directly (typed)
  verifyWebhookBody(body: PayOsWebhookPayload): WebhookVerifyResult {
    return this.verifyWebhook(body as unknown as Record<string, unknown>);
  }

  // Generate signature for create-payment request
  private sign(params: { orderCode: number; amount: number; description: string; returnUrl: string; cancelUrl: string }): string {
    // PayOS signature string: sorted params joined as key=value&...
    const str = `amount=${params.amount}&cancelUrl=${params.cancelUrl}&description=${params.description}&orderCode=${params.orderCode}&returnUrl=${params.returnUrl}`;
    return crypto.createHmac('sha256', this.checksumKey).update(str).digest('hex');
  }

  // Generate signature from webhook data object
  private signData(data: Record<string, unknown>): string {
    const sorted = Object.keys(data).sort().reduce<string[]>((acc, k) => {
      if (data[k] !== null && data[k] !== undefined) acc.push(`${k}=${data[k]}`);
      return acc;
    }, []);
    return crypto.createHmac('sha256', this.checksumKey).update(sorted.join('&')).digest('hex');
  }
}
