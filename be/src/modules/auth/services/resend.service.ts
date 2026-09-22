import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = config.get<string>('RESEND_FROM', 'FlexTrip <onboarding@resend.dev>');
  }

  async sendOtp(email: string, code: string): Promise<boolean> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `${code} là mã xác thực FlexTrip của bạn`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;color:#0f1729;font-size:22px">Xác thực email</h2>
            <p style="margin:0 0 24px;color:#5a6b85;font-size:15px">
              Nhập mã bên dưới để kích hoạt tài khoản FlexTrip của bạn.
              Mã có hiệu lực trong <strong>10 phút</strong>.
            </p>
            <div style="background:#f1f5fa;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:#2a7bd9">${code}</span>
            </div>
            <p style="margin:0;color:#8694ad;font-size:13px">
              Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.
            </p>
          </div>
        `,
      });
      if (error) {
        this.logger.error({ event: 'resend_otp_failed', name: error.name, message: (error as any).message, from: this.from });
        return false;
      }
      return true;
    } catch (e: unknown) {
      this.logger.error({ event: 'resend_otp_exception', message: (e as Error)?.message });
      return false;
    }
  }

  async sendProviderApproved(email: string, name: string, setupUrl: string): Promise<boolean> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: '🎉 Tài khoản Provider FlexTrip của bạn đã được duyệt!',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <div style="background:linear-gradient(135deg,#1e5aa8,#2a7bd9);border-radius:16px;padding:32px;text-align:center;margin-bottom:28px">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">🎉 Chào mừng bạn đến với FlexTrip!</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px">Tài khoản Provider của bạn đã được phê duyệt</p>
            </div>
            <p style="margin:0 0 16px;color:#0f1729;font-size:15px">Xin chào <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;color:#5a6b85;font-size:14px;line-height:1.6">
              FlexTrip rất vui được chào đón bạn trong cộng đồng Provider! Nhấn nút bên dưới để
              tạo mật khẩu và bắt đầu đăng tin cho thuê ngay hôm nay.
            </p>
            <div style="text-align:center;margin-bottom:28px">
              <a href="${setupUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#1e5aa8,#2a7bd9);color:#fff;
                        text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;
                        font-size:15px;box-shadow:0 4px 16px rgba(42,123,217,0.4)">
                Tạo mật khẩu ngay →
              </a>
            </div>
            <div style="background:#f1f5fa;border-radius:10px;padding:16px;margin-bottom:20px">
              <p style="margin:0;font-size:13px;color:#5a6b85">
                ⏰ Link có hiệu lực trong <strong>48 giờ</strong>.<br/>
                Nếu link hết hạn, hãy liên hệ <a href="mailto:support@flextrip.vn" style="color:#2a7bd9">support@flextrip.vn</a>.
              </p>
            </div>
            <p style="margin:0;color:#8694ad;font-size:12px;text-align:center">
              Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
            </p>
          </div>
        `,
      });
      return !error;
    } catch {
      return false;
    }
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<boolean> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Đặt lại mật khẩu FlexTrip',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;color:#0f1729;font-size:22px">Đặt lại mật khẩu</h2>
            <p style="margin:0 0 24px;color:#5a6b85;font-size:15px">
              Nhấn nút bên dưới để đặt lại mật khẩu. Link có hiệu lực trong <strong>30 phút</strong>.
            </p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#2a7bd9;color:#fff;text-decoration:none;
                      padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px">
              Đặt lại mật khẩu
            </a>
            <p style="margin:24px 0 0;color:#8694ad;font-size:13px">
              Nếu bạn không yêu cầu, hãy bỏ qua email này.
            </p>
          </div>
        `,
      });
      return !error;
    } catch {
      return false;
    }
  }
}
