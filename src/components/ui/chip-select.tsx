import { Pressable, Text, View } from 'react-native';

import { withAlpha } from '@/constants/tokens';
import { useTheme } from '@/providers/theme-provider';

export interface ChipOption {
  key: string;
  label: string;
  icon?: string;
}

interface ChipSelectProps {
  options: ChipOption[];
  value: string;
  onChange: (key: string) => void;
}

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const activeChip = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 9,
              paddingHorizontal: 13,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor: activeChip ? withAlpha(tokens.primary, 0.12) : tokens.surface,
              borderColor: activeChip ? tokens.primary : tokens.line,
            }}>
            {opt.icon ? <Text style={{ fontSize: 15 }}>{opt.icon}</Text> : null}
            <Text style={{ fontSize: 13, fontWeight: '600', color: activeChip ? tokens.primary : tokens.ink }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
