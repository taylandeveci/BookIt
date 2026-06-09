import React from 'react';
import { Badge } from '../Badge';
import { useTranslation } from 'react-i18next';

type BadgeVariant = 'primary' | 'secondary' | 'destructive' | 'muted';

interface StatusMapping {
  variant: BadgeVariant;
  labelKey: string;
  icon: string;
}

function getMapping(status: string): StatusMapping {
  const s = (status ?? '').toLowerCase();
  if (s === 'pending' || s === 'pending_confirmation') {
    return { variant: 'secondary', labelKey: 'common.pending', icon: 'time-outline' };
  }
  if (s === 'approved' || s === 'confirmed') {
    return { variant: 'primary', labelKey: 'common.confirmed', icon: 'checkmark-circle-outline' };
  }
  if (s === 'in_progress' || s === 'in_service') {
    return { variant: 'primary', labelKey: 'bookings.statusInProgress', icon: 'cut-outline' };
  }
  if (s === 'completed') {
    return { variant: 'muted', labelKey: 'common.completed', icon: 'checkmark-outline' };
  }
  if (s === 'cancelled' || s === 'cancelled_by_business' || s === 'cancelled_by_customer' || s === 'rejected') {
    return { variant: 'destructive', labelKey: 'common.cancelled', icon: 'close-circle-outline' };
  }
  if (s === 'no_show') {
    return { variant: 'destructive', labelKey: 'common.noShow', icon: 'person-remove-outline' };
  }
  if (s === 'disputed') {
    return { variant: 'secondary', labelKey: 'common.disputed', icon: 'alert-circle-outline' };
  }
  return { variant: 'muted', labelKey: 'common.pending', icon: 'time-outline' };
}

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const { t } = useTranslation();
  const { variant, labelKey, icon } = getMapping(status);
  return (
    <Badge
      label={t(labelKey)}
      variant={variant}
      icon={icon as any}
      iconSize={size === 'md' ? 14 : 12}
    />
  );
};
