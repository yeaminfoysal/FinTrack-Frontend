import { Pressable, ScrollView, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { SCREEN_GUTTER } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { useTheme } from '@/providers/theme-provider';

export interface ChipOption {
  key: string;
  label: string;
  icon?: IconName;
}

interface ChipSelectProps {
  options: ChipOption[];
  value: string;
  onChange: (key: string) => void;
  /** Group name read by screen readers, e.g. "ক্যাটাগরি". */
  accessibilityLabel?: string;
  /** One sideways-scrolling line instead of wrapping rows. Bleeds to the screen edges. */
  scroll?: boolean;
}

export function ChipSelect({ options, value, onChange, accessibilityLabel, scroll }: ChipSelectProps) {
  const { tokens } = useTheme();
  const chips = options.map((opt) => {
    const selected = opt.key === value;
    return (
      <Pressable
        key={opt.key}
        onPress={() => onChange(opt.key)}
        accessibilityRole="radio"
        accessibilityLabel={opt.label}
        accessibilityState={{ checked: selected }}
        style={({ pressed }) => ({
          minHeight: 42,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 8,
          paddingHorizontal: 13,
          borderRadius: 12,
          borderWidth: 1,
          backgroundColor: selected ? withAlpha(tokens.primary, 0.12) : tokens.surface,
          borderColor: selected ? tokens.primary : tokens.line,
          opacity: pressed ? 0.8 : 1,
        })}>
        {opt.icon ? <Icon name={opt.icon} size={17} color={selected ? tokens.primary : tokens.muted} /> : null}
        <Text style={{ fontSize: textSize.md, fontWeight: '600', color: selected ? tokens.primary : tokens.ink }}>
          {opt.label}
        </Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
        style={{ marginHorizontal: -SCREEN_GUTTER, flexGrow: 0 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: SCREEN_GUTTER }}>
        {chips}
      </ScrollView>
    );
  }
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {chips}
    </View>
  );
}
