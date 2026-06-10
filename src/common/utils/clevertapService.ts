import { Injectable } from '@nestjs/common';
import * as CleverTap from 'clevertap';
import * as dotenv from 'dotenv';

dotenv.config();

const { CLEVERTAP_ACCOUNT_ID, CLEVERTAP_ACCOUNT_PASSCODE, CLEVERTAP_REGION } =
  process.env;

interface ProfileData {
  identity: string;
  [key: string]: string;
}

interface CleverTapEvent {
  type: 'profile';
  identity: string;
  profileData: ProfileData;
}

interface CleverTapResponse {
  status: number;
  message: string;
  [key: string]: any;
}

@Injectable()
export class ClevertapService {
  private clevertap: typeof CleverTap;

  constructor() {
    this.clevertap = CleverTap.init(
      CLEVERTAP_ACCOUNT_ID,
      CLEVERTAP_ACCOUNT_PASSCODE,
      CLEVERTAP_REGION,
    );
  }

  async sendEvent(
    customerData: { _id?: string | { toString(): string } },
    userProperty: Record<string, string>,
    batchSize: number = 1,
  ): Promise<void> {
    try {
      const identity = customerData?._id?.toString();
      if (!identity) {
        throw new Error('Invalid customer data: missing Identity');
      }

      const profileData: ProfileData = {
        identity,
        ...userProperty,
      };

      const data: CleverTapEvent[] = [
        {
          type: 'profile',
          identity,
          profileData,
        },
      ];
      console.log({ data, profileData });
      await new Promise<void>((resolve, reject) => {
        this.clevertap.upload(
          data,
          { batchSize },
          (response: CleverTapResponse) => {
            console.log('CleverTap upload response:', response);
            if (response.status >= 400) {
              reject(new Error(`CleverTap upload failed: ${response.message}`));
            } else {
              resolve();
            }
          },
        );
      });
    } catch (error) {
      console.error('CleverTap event error:', error);
      throw error;
    }
  }
}
