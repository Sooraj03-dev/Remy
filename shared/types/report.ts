// shared/types/report.ts
// Shared Report types for community moderation

export type ReportTargetType = 'product' | 'user';
export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'scam'
  | 'counterfeit'
  | 'harassment'
  | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface CommunityReport {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

