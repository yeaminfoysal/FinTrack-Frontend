import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useTheme } from '@/providers/theme-provider';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Show a chevron after the action label (links to another screen). */
  actionChevron?: boolean;
}

export function SectionHeader({ title, actionLabel, onAction, actionChevron = true }: SectionHeaderProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 22,
        marginBottom: 10,
        paddingHorizontal: 4,
        minHeight: 32,
      }}>
      <Text accessibilityRole="header" style={{ fontSize: textSize.lg, fontWeight: '700', color: tokens.ink }}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={10}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            paddingVertical: 6,
            paddingLeft: 8,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Text style={{ fontSize: textSize.sm, fontWeight: '600', color: tokens.primary }}>{actionLabel}</Text>
          {actionChevron ? <Icon name="chevron-forward" size={14} color={tokens.primary} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}
