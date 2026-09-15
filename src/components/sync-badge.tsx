import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { useTheme } from '@/providers/theme-provider';

/** Live sync state pill; tapping it syncs now. `onFill` for use on a filled (green) card. */
export function SyncBadge({ onFill = false }: { onFill?: boolean }) {
  const { tokens } = useTheme();
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
      accessibilityLabel={`সিঙ্ক অবস্থা: ${sync.label}`}
      accessibilityHint={canSync ? 'এখনই সিঙ্ক করতে ট্যাপ করুন' : undefined}
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
      <Text style={{ fontSize: 12, fontWeight: '600', color: onFill ? tokens.onFill : tokens.ink }}>{sync.label}</Text>
    </Pressable>
  );
}
