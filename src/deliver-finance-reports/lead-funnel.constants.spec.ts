import {
  buildPhoneLeadOrderSourceInfo,
  LEAD_STAGE,
  MQL_SUB_STAGE,
} from './constants/lead-funnel.constants';

describe('buildPhoneLeadOrderSourceInfo', () => {
  it('sets stage for RNR with platform KMS (manual-operation default)', () => {
    const info = buildPhoneLeadOrderSourceInfo('phone_lead', LEAD_STAGE.RNR, null);
    expect(info).toEqual({
      platform: 'KMS',
      source: 'phone_lead',
      stage: 'RNR',
    });
  });

  it('sets stage and sub_stage for MQL', () => {
    const info = buildPhoneLeadOrderSourceInfo(
      'phone_lead',
      LEAD_STAGE.MQL,
      MQL_SUB_STAGE.CALL_AFTER_1_DAY,
    );
    expect(info.stage).toBe('MQL');
    expect(info.sub_stage).toBe('CALL_AFTER_1_DAY');
  });

  it('does not set sub_stage when lead stage is RNR', () => {
    const info = buildPhoneLeadOrderSourceInfo(
      'phone_lead',
      LEAD_STAGE.RNR,
      MQL_SUB_STAGE.CALL_AFTER_1_DAY,
    );
    expect(info.stage).toBe('RNR');
    expect(info.sub_stage).toBeUndefined();
  });

  it('keeps legacy KMS platform when requested', () => {
    const info = buildPhoneLeadOrderSourceInfo(
      'manual_order',
      LEAD_STAGE.SQL,
      null,
      'KMS',
    );
    expect(info.platform).toBe('KMS');
    expect(info.stage).toBe('SQL');
  });
});
