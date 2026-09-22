import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { FONT_FAMILY } from '@/constants/fonts';
import { radii } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { useStrings } from '@/lib/i18n';
import { useTheme } from '@/providers/theme-provider';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

/** Search input with a magnifier and a clear button. */
export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  const { tokens } = useTheme();
  const t = useStrings().ui;
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 12,
        paddingRight: 4,
        backgroundColor: tokens.surface,
        borderColor: focused ? tokens.primary : tokens.line,
        borderWidth: 1,
        borderRadius: radii.md,
      }}>
      <Icon name="search" size={18} color={tokens.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.muted}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 46,
          paddingVertical: 10,
          color: tokens.ink,
          fontSize: textSize.md,
          fontFamily: FONT_FAMILY.regular,
        }}
      />
      {value ? (
        <IconButton icon="close-circle" label={t.clearSearch} variant="plain" color={tokens.muted} onPress={() => onChangeText('')} />
      ) : null}
    </View>
  );
}
