import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing } from '../../theme/theme';
import { useTranslation } from 'react-i18next';
import { Service } from '../../types';

interface ServiceCardProps {
  service: Service;
  variant: 'customer' | 'employee' | 'owner';
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  style?: object;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  variant,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggle,
  style,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card style={[{ marginBottom: spacing.lg }, style]} pressable={variant === 'customer'} onPress={onSelect}>
      <Text style={[typography.headingSemiBold, { color: colors.foreground, fontSize: typography.sizes.md, marginBottom: spacing.xs }]}>
        {service.name}
      </Text>

      {service.description ? (
        <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm, marginBottom: spacing.sm }]}>
          {service.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: variant === 'customer' ? 0 : spacing.md }}>
        <Text style={[typography.bodySemiBold, { color: colors.secondary, fontSize: typography.sizes.lg, marginRight: spacing.md }]}>
          {Number(service.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
        </Text>
        <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm }]}>
          {service.durationMin} {t('common.min')}
        </Text>
      </View>

      {variant === 'owner' && (
        <View style={{ flexDirection: 'row' }}>
          <Button title={t('common.edit')} variant="outline" size="sm" onPress={onEdit} style={{ flex: 1, marginRight: spacing.xs }} />
          <Button title={t('common.delete')} variant="destructive" size="sm" onPress={onDelete} style={{ flex: 1, marginLeft: spacing.xs }} />
        </View>
      )}

      {variant === 'employee' && (
        <View style={{ flexDirection: 'row' }}>
          {isSelected ? (
            <Button title="Remove" variant="destructive" size="sm" onPress={onToggle} style={{ flex: 1 }} />
          ) : (
            <Button title="Add" variant="primary" size="sm" onPress={onToggle} style={{ flex: 1 }} />
          )}
        </View>
      )}
    </Card>
  );
};
