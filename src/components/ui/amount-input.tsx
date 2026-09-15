import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FONT_FAMILY } from '@/constants/fonts';
import { formatTaka, sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';

interface AmountInputProps {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  error?: string | null;
  autoFocus?: boolean;
  /** Color of the ৳ sign — hints what kind of entry this is. */
  accent?: string;
}

/** Large amount entry for the add/edit forms. Accepts Bangla digits and at most two decimals. */
export function AmountInput({ value, onChangeText, label = 'পরিমাণ', error, autoFocus, accent }: AmountInputProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const paisa = toPaisa(value || '0');

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.muted, marginLeft: 2 }}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: tokens.surface,
          borderColor: error ? tokens.expense : focused ? tokens.primary : tokens.line,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 4,
        }}>
        <Text style={{ fontSize: 28, fontWeight: '600', color: accent ?? tokens.primary }}>৳</Text>
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(sanitizeAmountInput(text))}
          placeholder="0"
          placeholderTextColor={tokens.muted}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          style={{ flex: 1, minWidth: 0, color: tokens.ink, fontSize: 34, fontFamily: FONT_FAMILY.bold, paddingVertical: 6 }}
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 12.5, color: tokens.expense, marginLeft: 2 }}>
          {error}
        </Text>
      ) : paisa >= 100000 ? (
        <Text style={{ fontSize: 12.5, color: tokens.muted, marginLeft: 2 }}>{formatTaka(paisa)}</Text>
      ) : null}
    </View>
  );
}
