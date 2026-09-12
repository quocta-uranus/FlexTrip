import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';

export const SMTP_TRANSPORT_FACTORY = Symbol('SMTP_TRANSPORT_FACTORY');
export type SmtpTransportFactory = (options: {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth: { user: string; pass: string };
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
}) => Transporter;

@Injectable()
export class MailService {
  constructor(
    private readonly config: ConfigService,
    @Inject(SMTP_TRANSPORT_FACTORY)
    private readonly createTransport: SmtpTransportFactory,
  ) {}

  async sendVerification(email: string, token: string): Promise<void> {
    return this.sendLink(
      email,
      token,
      'EMAIL_VERIFICATION_URL',
      'Verify your FlexTrip email',
      'Confirm your email within 30 minutes: ',
    );
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    return this.sendLink(
      email,
      token,
      'PASSWORD_RESET_URL',
      'Reset your FlexTrip password',
      'Reset your password within 30 minutes: ',
    );
  }

  private async sendLink(
    email: string,
    token: string,
    urlConfigKey: string,
    subject: string,
    instruction: string,
  ): Promise<void> {
    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const port = Number(this.config.getOrThrow<string>('SMTP_PORT'));
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.config.getOrThrow<string>('SMTP_USER');
    const pass = this.config.getOrThrow<string>('SMTP_PASSWORD');
    const from = this.config.getOrThrow<string>('SMTP_FROM');
    const url = new URL(this.config.getOrThrow<string>(urlConfigKey));
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !host ||
      !from ||
      !user ||
      !pass
    )
      throw new Error('Invalid mail configuration');
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error('Invalid SMTP port');
    url.searchParams.set('token', token);
    const transport = this.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    try {
      const result = await transport.sendMail({
        from,
        to: email,
        subject,
        text:
          instruction +
          url.toString() +
          '\nIf you did not request this, ignore this email.',
      });
      if (!result.accepted?.length || Boolean(result.rejected?.length))
        throw new Error('SMTP did not accept recipient');
    } finally {
      transport.close();
    }
  }
}
