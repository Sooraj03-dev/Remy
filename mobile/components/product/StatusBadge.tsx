// mobile/components/product/StatusBadge.tsx
// Pill badge showing product listing status

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ProductStatus, OrderStatus } from '@shared/index';
import { Radius, Spacing, FontSize, FontWeight } from '@constants/theme';

type AnyStatus = ProductStatus | OrderStatus;

const statusConfig: Record<
  AnyStatus,
  { backgroundColor: string; color: string; label: string }
> = {
  // Product statuses
  available: { backgroundColor: '#CFF2E2', color: '#1A7A52', label: 'Available' },
  pending: { backgroundColor: '#FFF3CD', color: '#856404', label: 'Pending' },
  pending_review: { backgroundColor: '#E8DFFF', color: '#5B3FA6', label: 'Pending Review' },
  under_review: { backgroundColor: '#E8DFFF', color: '#5B3FA6', label: 'Under Review' },
  sold: { backgroundColor: '#FFE0DC', color: '#C0392B', label: 'Sold' },
  rejected: { backgroundColor: '#FFE0DC', color: '#C0392B', label: 'Rejected' },
  verified: { backgroundColor: '#CFF2E2', color: '#1A7A52', label: 'Verified' },
  changes_requested: { backgroundColor: '#FFF3CD', color: '#856404', label: 'Changes Requested' },
  removed: { backgroundColor: '#FFE0DC', color: '#C0392B', label: 'Removed' },

  // Order statuses
  placed: { backgroundColor: '#FFF3CD', color: '#856404', label: 'Placed' },
  confirmed: { backgroundColor: '#E8DFFF', color: '#5B3FA6', label: 'Confirmed' },
  meetup_arranged: { backgroundColor: '#CFF2E2', color: '#1A7A52', label: 'Meetup Arranged' },
  completed: { backgroundColor: '#CFF2E2', color: '#1A7A52', label: 'Completed' },
  refunded: { backgroundColor: '#FFE0DC', color: '#C0392B', label: 'Refunded' },
  cancelled: { backgroundColor: '#FFE0DC', color: '#C0392B', label: 'Cancelled' },
};

interface StatusBadgeProps {
  status: AnyStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    backgroundColor: '#E8DFFF',
    color: '#5B3FA6',
    label: String(status),
  };
  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
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
  text: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
  },
});

