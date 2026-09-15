import { useState, type ReactNode } from 'react';
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type TextInputProps,
} from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { FONT_FAMILY } from '@/constants/fonts';
import { useTheme } from '@/providers/theme-provider';

interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Password input — also gets a show/hide toggle. */
  secureTextEntry?: boolean;
  maxLength?: number;
  /** Autofill hints, e.g. "one-time-code" / "oneTimeCode" for emailed codes. */
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  autoFocus?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  /** Big glyph prefix (e.g. "৳"). */
  prefix?: string;
  /** Validation message under the input; also turns the border red. */
  error?: string | null;
  /** Helper text under the input when there is no error. */
  hint?: string;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoCapitalize = 'sentences',
  secureTextEntry,
  maxLength,
  autoComplete,
  textContentType,
  autoFocus,
  returnKeyType,
  onSubmitEditing,
  prefix,
  error,
  hint,
}: FieldProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? tokens.expense : focused ? tokens.primary : tokens.line;

  return (
    <View style={{ gap: 7 }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: tokens.surface,
          borderColor,
          borderWidth: 1,
          borderRadius: 14,
          paddingLeft: 14,
          paddingRight: secureTextEntry ? 4 : 14,
        }}>
        {prefix ? <Text style={{ fontSize: 18, color: tokens.primary }}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry && !revealed}
          maxLength={maxLength}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label ?? placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            color: tokens.ink,
            fontSize: 15,
            fontFamily: FONT_FAMILY.regular,
            paddingVertical: 12,
            minHeight: multiline ? 76 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {secureTextEntry ? (
          <IconButton
            icon={revealed ? 'eye-off-outline' : 'eye-outline'}
            label={revealed ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
            variant="plain"
            color={tokens.muted}
            onPress={() => setRevealed((r) => !r)}
          />
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 12.5, lineHeight: 18, color: tokens.expense, marginLeft: 2 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: tokens.muted, marginLeft: 2 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** Label for a form control that isn't a Field (chips, segmented controls, dates). */
export function FieldLabel({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.muted, marginLeft: 2 }}>{children}</Text>;
}
