import { Text, type StyleProp, type TextStyle } from 'react-native';

import { formatTaka, formatTakaSigned } from '@/lib/money';

interface AmountTextProps {
  paisa: number;
  signed?: boolean;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Consistent ৳ display with tabular numerals (the prototype "num" style). */
export function AmountText({ paisa, signed, size = 14, weight = '600', color, style }: AmountTextProps) {
  return (
    <Text
      style={[
        { fontSize: size, fontWeight: weight, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
        color ? { color } : null,
        style,
      ]}>
      {signed ? formatTakaSigned(paisa) : formatTaka(paisa)}
    </Text>
  );
}
