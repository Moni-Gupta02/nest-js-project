export const WHATSAPP_NOTIFICATION_CHANNELS = {
  PHONE_SALES_PAYMENT_LINK: 'phone_sales_payment_link',
  RNR_FOLLOWUP: 'rnr_followup_notification',
  MENU_SHARING: 'menu_sharing_notification',
} as const;

export type WhatsappNotificationChannel =
  (typeof WHATSAPP_NOTIFICATION_CHANNELS)[keyof typeof WHATSAPP_NOTIFICATION_CHANNELS];
