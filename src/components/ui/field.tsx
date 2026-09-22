import { useState, type ReactNode } from 'react';
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type TextInputProps,
} from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { useScrollFocusedIntoView } from '@/components/ui/keyboard-scroll-view';
import { Text } from '@/components/ui/text';
import { FONT_FAMILY } from '@/constants/fonts';
import { textSize } from '@/constants/typography';
import { useStrings } from '@/lib/i18n';
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
  const t = useStrings().ui;
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // Tapping a second field leaves the keyboard where it is, so the scroll view is only
  // told to move by the focus itself.
  const scrollIntoView = useScrollFocusedIntoView();
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
        {prefix ? <Text style={{ fontSize: textSize.xl, color: tokens.primary }}>{prefix}</Text> : null}
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
          onFocus={() => {
            setFocused(true);
            scrollIntoView?.();
          }}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label ?? placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            color: tokens.ink,
            fontSize: textSize.lg,
            fontFamily: FONT_FAMILY.regular,
            paddingVertical: 12,
            minHeight: multiline ? 76 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {secureTextEntry ? (
          <IconButton
            icon={revealed ? 'eye-off-outline' : 'eye-outline'}
            label={revealed ? t.hidePassword : t.showPassword}
            variant="plain"
            color={tokens.muted}
            onPress={() => setRevealed((r) => !r)}
          />
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.expense, marginLeft: 2 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.muted, marginLeft: 2 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** Label for a form control that isn't a Field (chips, segmented controls, dates). */
export function FieldLabel({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return <Text style={{ fontSize: textSize.sm, fontWeight: '600', color: tokens.muted, marginLeft: 2 }}>{children}</Text>;
}
