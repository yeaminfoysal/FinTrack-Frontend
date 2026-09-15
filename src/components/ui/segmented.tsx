import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useTheme } from '@/providers/theme-provider';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}

export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
  const { tokens } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        gap: 4,
        backgroundColor: tokens.surface2,
        borderColor: tokens.line,
        borderWidth: 1,
        borderRadius: 14,
        padding: 4,
      }}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: 40,
              justifyContent: 'center',
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: selected ? tokens.surface : 'transparent',
              shadowColor: '#000',
              shadowOpacity: selected ? 0.18 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: selected ? 2 : 0,
            }}>
            <Text style={{ fontSize: textSize.md, fontWeight: '600', color: selected ? tokens.ink : tokens.muted }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
