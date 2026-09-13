import { Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  maxLength?: number;
  /** Autofill hints, e.g. "one-time-code" / "oneTimeCode" for emailed codes. */
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  /** Big glyph prefix (e.g. "৳"). */
  prefix?: string;
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
  prefix,
}: FieldProps) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      {label ? (
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: tokens.muted, marginLeft: 2 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: tokens.surface,
          borderColor: tokens.line,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
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
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoComplete={autoComplete}
          textContentType={textContentType}
          style={{
            flex: 1,
            color: tokens.ink,
            fontSize: 15,
            paddingVertical: 13,
            minHeight: multiline ? 72 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
      </View>
    </View>
  );
}
