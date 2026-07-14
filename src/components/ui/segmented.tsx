import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const { tokens } = useTheme();
  return (
    <View
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
        const activeTab = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeTab ? tokens.surface : 'transparent',
              shadowColor: '#000',
              shadowOpacity: activeTab ? 0.18 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: activeTab ? 2 : 0,
            }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab ? tokens.ink : tokens.muted }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
