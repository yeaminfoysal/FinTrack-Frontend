import type { StyleProp, TextStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { textSize, type TextSize } from '@/constants/typography';
import { formatTaka, formatTakaSigned } from '@/lib/money';

interface AmountTextProps {
  paisa: number;
  signed?: boolean;
  size?: TextSize;
  weight?: TextStyle['fontWeight'];
  color?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

/** Consistent ৳ display with tabular numerals (the prototype "num" style). */
export function AmountText({ paisa, signed, size = 'md', weight = '600', color, numberOfLines, style }: AmountTextProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontSize: textSize[size], fontWeight: weight, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
        color ? { color } : null,
        style,
      ]}>
      {signed ? formatTakaSigned(paisa) : formatTaka(paisa)}
    </Text>
  );
}
