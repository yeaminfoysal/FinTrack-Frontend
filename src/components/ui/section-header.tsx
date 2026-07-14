import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 22,
        marginBottom: 12,
        paddingHorizontal: 4,
      }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.ink }}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.primary }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
