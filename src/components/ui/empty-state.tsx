import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { useTheme } from '@/providers/theme-provider';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Placeholder for an empty list, optionally with the action that fills it. */
export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 6,
        paddingVertical: 22,
        paddingHorizontal: 20,
        backgroundColor: tokens.surface,
        borderColor: tokens.line,
        borderWidth: 1,
        borderRadius: 16,
      }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          marginBottom: 4,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(tokens.primary, 0.12),
        }}>
        <Icon name={icon} size={24} color={tokens.primary} />
      </View>
      <Text style={{ fontSize: textSize.lg, fontWeight: '600', color: tokens.ink, textAlign: 'center' }}>{title}</Text>
      {message ? (
        <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted, textAlign: 'center' }}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} icon="add" size="sm" onPress={onAction} style={{ marginTop: 8, paddingHorizontal: 18 }} />
      ) : null}
    </View>
  );
}
