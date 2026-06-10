/** Lead funnel stage codes (leadstagehistories.to_stage / from_stage). */
export const LEAD_STAGE = {
  RNR: 'RNR',
  DQL: 'DQL',
  MQL: 'MQL',
  SQL: 'SQL',
  CONVERTED: 'CONVERTED',
} as const;

export type LeadStageCode = (typeof LEAD_STAGE)[keyof typeof LEAD_STAGE];

export const LEAD_STAGE_CODES = Object.values(LEAD_STAGE);

/** Manual PATCH allowed stages only. */
export const MANUAL_LEAD_STAGE_CODES = [
  LEAD_STAGE.RNR,
  LEAD_STAGE.DQL,
  LEAD_STAGE.MQL,
] as const;

/** MQL sub-stage codes (leadstagehistories.sub_stage). */
export const MQL_SUB_STAGE = {
  CALL_AFTER_1_DAY: 'CALL_AFTER_1_DAY',
  CALL_AFTER_2_DAY: 'CALL_AFTER_2_DAY',
  CX_TEAM_ACTION: 'CX_TEAM_ACTION',
} as const;

export type MqlSubStageCode =
  (typeof MQL_SUB_STAGE)[keyof typeof MQL_SUB_STAGE];

export const MQL_SUB_STAGE_CODES = Object.values(MQL_SUB_STAGE);

export const isCxTeamSubStage = (subStage?: string | null): boolean =>
  subStage === MQL_SUB_STAGE.CX_TEAM_ACTION;

/** Order / history source when sub_stage is CX_TEAM_ACTION. */
export const LEAD_HISTORY_SOURCE = {
  PHONE_LEAD: 'phone_lead',
  CX_TEAM_LEAD: 'cx_team_lead',
  MANUAL_ORDER: 'manual_order',
} as const;

export const LEAD_FUNNEL_STAGES = [
  {
    code: LEAD_STAGE.RNR,
    label: 'Raw / Not Responded',
    description: 'Manual phone-lead stage update',
    set_by: 'manual',
  },
  {
    code: LEAD_STAGE.DQL,
    label: 'Disqualified Lead',
    description: 'Manual phone-lead stage update',
    set_by: 'manual',
  },
  {
    code: LEAD_STAGE.MQL,
    label: 'Marketing Qualified Lead',
    description: 'Manual update; use sub_stage for reminders or CX team',
    set_by: 'manual',
  },
  {
    code: LEAD_STAGE.SQL,
    label: 'Sales Qualified Lead',
    description: 'Payment link generated (manual operation order create)',
    set_by: 'system_payment_link',
  },
  {
    code: LEAD_STAGE.CONVERTED,
    label: 'Payment Completed',
    description: 'Order paid after SQL (checkout webhook)',
    set_by: 'system_payment_captured',
  },
] as const;

export const MQL_SUB_STAGES = [
  {
    code: MQL_SUB_STAGE.CALL_AFTER_1_DAY,
    label: 'Reminder - 1 day',
    type: 'reminder',
  },
  {
    code: MQL_SUB_STAGE.CALL_AFTER_2_DAY,
    label: 'Reminder - 2 day',
    type: 'reminder',
  },
  {
    code: MQL_SUB_STAGE.CX_TEAM_ACTION,
    label: 'CX team',
    type: 'cx_team',
  },
] as const;

export const resolveLeadHistorySource = (
  nextSubStage?: string | null,
  previousSubStage?: string | null,
): (typeof LEAD_HISTORY_SOURCE)[keyof typeof LEAD_HISTORY_SOURCE] => {
  if (isCxTeamSubStage(nextSubStage) || isCxTeamSubStage(previousSubStage)) {
    return LEAD_HISTORY_SOURCE.CX_TEAM_LEAD;
  }

  return LEAD_HISTORY_SOURCE.PHONE_LEAD;
};

/** Stages stored on order.source_info.stage (from cart lead_stage_code / history). */
export const ORDER_SOURCE_LEAD_STAGE_CODES = [
  LEAD_STAGE.RNR,
  LEAD_STAGE.DQL,
  LEAD_STAGE.MQL,
  LEAD_STAGE.SQL,
] as const;

export type OrderSourceLeadStageCode =
  (typeof ORDER_SOURCE_LEAD_STAGE_CODES)[number];

export const PHONE_LEAD_ORDER_PLATFORMS = ['delicut', 'KMS'] as const;

export type PhoneLeadOrderSourceInfo = {
  platform: (typeof PHONE_LEAD_ORDER_PLATFORMS)[number];
  source: (typeof LEAD_HISTORY_SOURCE)[keyof typeof LEAD_HISTORY_SOURCE];
  /** Cart / history lead stage: RNR | DQL | MQL | SQL */
  stage?: OrderSourceLeadStageCode;
  /** MQL only: CALL_AFTER_1_DAY | CALL_AFTER_2_DAY | CX_TEAM_ACTION */
  sub_stage?: MqlSubStageCode;
};

export const isOrderSourceLeadStageCode = (
  value?: string | null,
): value is OrderSourceLeadStageCode =>
  !!value &&
  ORDER_SOURCE_LEAD_STAGE_CODES.includes(value as OrderSourceLeadStageCode);

/** @deprecated Use buildPhoneLeadOrderSourceInfo */
export type KmsOrderSourceInfo = PhoneLeadOrderSourceInfo;

/** Build order source_info from cart lead stage + optional MQL sub_stage. */
export const buildPhoneLeadOrderSourceInfo = (
  source: PhoneLeadOrderSourceInfo['source'],
  leadStageCode?: string | null,
  subStage?: string | null,
  platform: PhoneLeadOrderSourceInfo['platform'] = 'KMS',
): PhoneLeadOrderSourceInfo => {
  const info: PhoneLeadOrderSourceInfo = { platform, source };
  if (isOrderSourceLeadStageCode(leadStageCode)) {
    info.stage = leadStageCode;
  }
  if (
    leadStageCode === LEAD_STAGE.MQL &&
    subStage &&
    MQL_SUB_STAGE_CODES.includes(subStage as MqlSubStageCode)
  ) {
    info.sub_stage = subStage as MqlSubStageCode;
  }
  return info;
};

/** @deprecated Use buildPhoneLeadOrderSourceInfo */
export const buildKmsOrderSourceInfo = (
  source: PhoneLeadOrderSourceInfo['source'],
  subStage?: string | null,
): PhoneLeadOrderSourceInfo =>
  buildPhoneLeadOrderSourceInfo(source, LEAD_STAGE.MQL, subStage, 'KMS');
