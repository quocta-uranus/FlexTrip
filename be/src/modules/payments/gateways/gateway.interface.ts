export interface PaymentInitResult {
  orderCode: string;
  redirectUrl: string;
}

export interface WebhookVerifyResult {
  isValid: boolean;
  orderCode: string;
  transactionId: string;
  amount: number;
  success: boolean;
}

export interface GatewayRefundResult {
  success: boolean;
  gatewayRef?: string;
  message: string;
}

export interface IPaymentGateway {
  initiate(params: {
    orderCode: string;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    ipAddress?: string;
  }): Promise<PaymentInitResult>;

  verifyWebhook(payload: Record<string, string>): WebhookVerifyResult;

  refund?(params: {
    orderCode: string;
    transactionId: string;
    amount: number;
    transactionDate: string;
    reason: string;
    ipAddress?: string;
  }): Promise<GatewayRefundResult>;
}
