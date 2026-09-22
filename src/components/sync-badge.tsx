import { Pressable } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { useStrings } from '@/lib/i18n';
import { useTheme } from '@/providers/theme-provider';

/** Live sync state pill; tapping it syncs now. `onFill` for use on a filled (green) card. */
export function SyncBadge({ onFill = false }: { onFill?: boolean }) {
  const { tokens } = useTheme();
  const t = useStrings().sync;
  const sync = useSyncStatus();
  const toneColor = {
    ok: tokens.income,
    busy: tokens.primary,
    pending: tokens.borrowed,
    offline: tokens.muted,
    error: tokens.expense,
    demo: tokens.lent,
  }[sync.tone];
  const canSync = !sync.isDemo && !sync.isSyncing;

  return (
    <Pressable
      onPress={canSync ? () => void sync.syncNow() : undefined}
      disabled={!canSync}
      accessibilityRole="button"
      accessibilityLabel={t.badgeA11y(sync.label)}
      accessibilityHint={canSync ? t.badgeHint : undefined}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: onFill ? 'rgba(0,0,0,0.2)' : withAlpha(toneColor, 0.12),
        opacity: pressed ? 0.75 : 1,
      })}>
      <Icon name={sync.icon} size={14} color={onFill ? tokens.onFill : toneColor} />
      <Text style={{ fontSize: textSize.xs, fontWeight: '600', color: onFill ? tokens.onFill : tokens.ink }}>{sync.label}</Text>
    </Pressable>
  );
}
