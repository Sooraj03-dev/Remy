// shared/types/verification.ts
// Shared Verification Audit types

export type VerificationAction =
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'ai_passed'
  | 'ai_flagged';

export interface VerificationLog {
  id: string;
  productId: string;
  reviewerId?: string;
  reviewerName?: string;
  action: VerificationAction;
  notes?: string;
  createdAt: string;
}

