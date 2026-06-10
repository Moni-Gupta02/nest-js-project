import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationMasterService } from './notification_master.service';
import type { WhatsappNotificationChannel } from './constants/whatsapp-notification-channels';

export type CustomerWhatsappSource = {
  email?: string | null;
  whatsapp_country_code?: string | null;
  country_code?: string | null;
  whatsapp_number?: string | null;
  phone_number?: string | null;
  first_name?: string | null;
};

export type SendWhatsappNotificationResult = {
  success: boolean;
  messageId?: string;
  notificationData?: Record<string, string>;
};

@Injectable()
export class WhatsappNotificationService {
  constructor(
    private readonly notificationMasterService: NotificationMasterService,
  ) {}

  resolveCustomerWhatsappContact(customer: CustomerWhatsappSource): {
    country_code: string | null;
    phone_number: string | null;
    phone_source: string;
  } {
    const whatsappCountry = customer.whatsapp_country_code?.trim();
    const whatsappNumber = customer.whatsapp_number?.trim();
    if (whatsappCountry && whatsappNumber) {
      return {
        country_code: whatsappCountry.startsWith('+')
          ? whatsappCountry
          : `+${whatsappCountry}`,
        phone_number: whatsappNumber.replace(/\s+/g, ''),
        phone_source: 'customer.whatsapp',
      };
    }

    const countryCode = customer.country_code?.trim();
    const phoneNumber = customer.phone_number?.trim();
    if (countryCode && phoneNumber) {
      return {
        country_code: countryCode.startsWith('+')
          ? countryCode
          : `+${countryCode}`,
        phone_number: phoneNumber.replace(/\s+/g, ''),
        phone_source: 'customer.phone',
      };
    }

    return {
      country_code: null,
      phone_number: null,
      phone_source: 'missing',
    };
  }

  buildCustomerNotificationPayload(
    customerId: string,
    customer: CustomerWhatsappSource,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const resolved = this.resolveCustomerWhatsappContact(customer);
    return {
      customer_id: customerId,
      email: customer.email ?? null,
      country_code: resolved.country_code,
      phone_number: resolved.phone_number,
      first_name: customer.first_name?.trim() || '',
      createdAt: new Date(),
      phone_source: resolved.phone_source,
      ...extra,
    };
  }

  assertWhatsappDestination(payload: {
    country_code?: unknown;
    phone_number?: unknown;
  }): void {
    if (!payload.country_code || !payload.phone_number) {
      throw new BadRequestException(
        'WhatsApp destination is missing on the customer profile (whatsapp_number + whatsapp_country_code, or phone_number + country_code).',
      );
    }
  }

  async sendWhatsappNotification(
    channel: WhatsappNotificationChannel | string,
    notificationPayload: Record<string, unknown>,
  ): Promise<SendWhatsappNotificationResult> {
    const result = await this.notificationMasterService.sendNotificationMessage({
      channel,
      notificationPayload,
    });

    return {
      success: true,
      messageId: result?.messageId,
      notificationData: result?.notificationData as Record<string, string>,
    };
  }

  async sendWhatsappToCustomer(
    channel: WhatsappNotificationChannel | string,
    customerId: string,
    customer: CustomerWhatsappSource,
    extra: Record<string, unknown> = {},
  ): Promise<{
    payload: Record<string, unknown>;
    result: SendWhatsappNotificationResult;
  }> {
    const payload = this.buildCustomerNotificationPayload(
      customerId,
      customer,
      extra,
    );
    this.assertWhatsappDestination(payload);
    const result = await this.sendWhatsappNotification(channel, payload);
    return { payload, result };
  }
}
