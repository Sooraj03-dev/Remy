// mobile/components/product/StatusBadge.tsx
// Pill badge showing product listing status

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ProductStatus, OrderStatus } from '@shared/index';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Radius, Spacing } from '@constants/theme';

type AnyStatus = ProductStatus | OrderStatus;

const statusConfig: Record<
  AnyStatus,
  { backgroundColor: string; color: string; label: string }
> = {
  // Product statuses
  available: { backgroundColor: Colors.successBg, color: Colors.successText, label: 'Available' },
  pending: { backgroundColor: Colors.warningBg, color: Colors.warningText, label: 'Pending' },
  pending_review: { backgroundColor: Colors.primarySoft, color: Colors.primary, label: 'Pending Review' },
  under_review: { backgroundColor: Colors.primarySoft, color: Colors.primary, label: 'Under Review' },
  sold: { backgroundColor: Colors.errorBg, color: Colors.errorText, label: 'Sold' },
  rejected: { backgroundColor: Colors.errorBg, color: Colors.errorText, label: 'Rejected' },
  verified: { backgroundColor: Colors.successBg, color: Colors.successText, label: 'Verified' },
  changes_requested: { backgroundColor: Colors.warningBg, color: Colors.warningText, label: 'Changes Requested' },
  removed: { backgroundColor: Colors.errorBg, color: Colors.errorText, label: 'Removed' },

  // Order statuses
  inquiry: { backgroundColor: Colors.primarySoft, color: Colors.primary, label: 'Inquiry' },
  placed: { backgroundColor: Colors.warningBg, color: Colors.warningText, label: 'Placed' },
  confirmed: { backgroundColor: Colors.primarySoft, color: Colors.primary, label: 'Confirmed' },
  meetup_arranged: { backgroundColor: Colors.successBg, color: Colors.successText, label: 'Meetup Arranged' },
  completed: { backgroundColor: Colors.successBg, color: Colors.successText, label: 'Completed' },
  refunded: { backgroundColor: Colors.errorBg, color: Colors.errorText, label: 'Refunded' },
  cancelled: { backgroundColor: Colors.errorBg, color: Colors.errorText, label: 'Cancelled' },
};

interface StatusBadgeProps {
  status: AnyStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    backgroundColor: Colors.primarySoft,
    color: Colors.primary,
    label: String(status),
  };
  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <ClayText variant="label" color={config.color} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {config.label}
      </ClayText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
});

