export type PhaseType = 'PICK' | 'NDD' | 'MP';

export type DeliveryOwnType = 'Delivery' | 'Pickup';

export type VendorType = 'Transcorp' | 'Own';

export class PickTranscorpReportQueryDto {
  date: string;
  type: string;
  vendor: string;
}

export class GenerateCsvQueryDto {
  date: string;
  type: string;
  vendor: string;
}

export class FinalizeDriversCodeQueryDto {
  date: string;
  type: string;
  vendor?: string;
}

export class MergeAllTranscorpDto {
  date: string;
  type: string;
  vendor: string;
}

export class ManualMergeTranscorpDto {
  date: string;
  type: string;
  vendor: string;
  awbs: string[];
}

export class UnmergeTranscorpDto {
  date: string;
  type: string;
  vendor: string;
  awbs: string[];
}