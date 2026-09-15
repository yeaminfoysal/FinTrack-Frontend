import type { ReactNode } from 'react';
import { type AccessibilityRole, type AccessibilityState, Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { radii, withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { useTheme } from '@/providers/theme-provider';

interface ListRowProps {
  title: string;
  /** Second line; may contain nested <Text> for colored parts. */
  subtitle?: ReactNode;
  icon?: IconName;
  /** Accent for the icon tile. */
  tint?: string;
  /** Replaces the icon tile, e.g. a person's initial. */
  leading?: ReactNode;
  /** Right side, usually an amount. */
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  /** Line above the row — set it on every row after the first inside a ListGroup. */
  divider?: boolean;
  /** Greyed-out title, e.g. a settled loan. */
  dim?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
}

/** One line of a list: icon tile, title with an optional subtitle, and a trailing value. */
export function ListRow({
  title,
  subtitle,
  icon,
  tint,
  leading,
  trailing,
  onPress,
  selected,
  divider,
  dim,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
}: ListRowProps) {
  const { tokens } = useTheme();
  const accent = tint ?? tokens.muted;

  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: divider ? 1 : 0,
    borderTopColor: tokens.line,
    backgroundColor: selected ? withAlpha(tokens.primary, 0.12) : 'transparent',
  };

  const content = (
    <>
      {leading ??
        (icon ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(accent, 0.12),
            }}>
            <Icon name={icon} size={20} color={accent} />
          </View>
        ) : null)}
      <View style={{ flex: 1, gap: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: textSize.md,
            fontWeight: '600',
            color: selected ? tokens.primary : dim ? tokens.muted : tokens.ink,
          }}>
          {title}
        </Text>
        {subtitle != null && subtitle !== '' ? (
          <Text numberOfLines={1} style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {selected ? <Icon name="checkmark" size={20} color={tokens.primary} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel} style={base}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={selected != null ? { selected, ...accessibilityState } : accessibilityState}
      style={({ pressed }) => [base, { opacity: pressed ? 0.7 : 1 }]}>
      {content}
    </Pressable>
  );
}

/**
 * One row's slice of a ListGroup, for virtualized lists that render rows one by one:
 * the first row gets the top corners, the last the bottom ones.
 */
export function ListGroupItem({ first, last, children }: { first: boolean; last: boolean; children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.line,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: last ? 1 : 0,
        borderTopLeftRadius: first ? radii.md : 0,
        borderTopRightRadius: first ? radii.md : 0,
        borderBottomLeftRadius: last ? radii.md : 0,
        borderBottomRightRadius: last ? radii.md : 0,
        overflow: 'hidden',
      }}>
      {children}
    </View>
  );
}

/** Rounded surface that holds ListRows. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.line,
          borderWidth: 1,
          borderRadius: radii.md,
          overflow: 'hidden',
        },
        style,
      ]}>
      {children}
    </View>
  );
}
