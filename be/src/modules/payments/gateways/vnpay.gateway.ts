import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { IPaymentGateway, PaymentInitResult, WebhookVerifyResult } from './gateway.interface';

@Injectable()
export class VnpayGateway implements IPaymentGateway {
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.tmnCode = config.get<string>('VNPAY_TMN_CODE', '').trim();
    this.hashSecret = config.get<string>('VNPAY_HASH_SECRET', '').trim();
    this.baseUrl = config.get<string>('VNPAY_BASE_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').trim();
    console.log('[VNPay] TmnCode:', this.tmnCode, '| HashSecret length:', this.hashSecret.length);
  }

  async initiate(params: {
    orderCode: string;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    ipAddress?: string;
  }): Promise<PaymentInitResult> {
    const now = new Date();
    const createDate = this.formatDate(now);
    const expireDate = this.formatDate(new Date(now.getTime() + 15 * 60 * 1000));

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: String(Math.round(params.amount) * 100),
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: params.ipAddress ?? '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: params.description.substring(0, 255),
      vnp_OrderType: '250000',
      vnp_ReturnUrl: params.returnUrl,
      vnp_TxnRef: params.orderCode,
      vnp_ExpireDate: expireDate,
    };

    const sorted = this.sortObject(vnpParams);
    // URLSearchParams encodes spaces as '+' and special chars as %XX — matches PHP urlencode()
    const signData = new URLSearchParams(sorted).toString();
    const signature = crypto.createHmac('sha512', this.hashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');

    const redirectUrl = `${this.baseUrl}?${signData}&vnp_SecureHash=${signature}`;
    console.log('[VNPay] signData:', signData);
    console.log('[VNPay] redirectUrl:', redirectUrl);
    return { orderCode: params.orderCode, redirectUrl };
  }

  verifyWebhook(payload: Record<string, string>): WebhookVerifyResult {
    const { vnp_SecureHash, ...rest } = payload;
    const sorted = this.sortObject(rest as Record<string, string>);
    const signData = new URLSearchParams(sorted).toString();
    const expected = crypto.createHmac('sha512', this.hashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = expected === vnp_SecureHash;
    const success = payload['vnp_ResponseCode'] === '00' && payload['vnp_TransactionStatus'] === '00';

    return {
      isValid,
      orderCode: payload['vnp_TxnRef'] ?? '',
      transactionId: payload['vnp_TransactionNo'] ?? '',
      amount: parseInt(payload['vnp_Amount'] ?? '0', 10) / 100,
      success,
    };
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, string>>((acc, k) => { acc[k] = obj[k]; return acc; }, {});
  }

  private formatDate(date: Date): string {
    // VNPay yêu cầu giờ Việt Nam (UTC+7)
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vn.toISOString().replace(/[-:TZ.]/g, '').substring(0, 14);
  }
}
