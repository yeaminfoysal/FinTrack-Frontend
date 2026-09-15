/**
 * App typeface: Hind Siliguri (Bangla + Latin), loaded in the root layout. Android
 * can't synthesize weights for custom fonts, so every weight is its own family and
 * text picks the family from the fontWeight it asks for (components/ui/text.tsx).
 */
import type { TextStyle } from 'react-native';

export const FONT_FAMILY = {
  regular: 'HindSiliguri_400Regular',
  medium: 'HindSiliguri_500Medium',
  semibold: 'HindSiliguri_600SemiBold',
  bold: 'HindSiliguri_700Bold',
} as const;

export function fontFamilyFor(weight: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500':
    case 'medium':
      return FONT_FAMILY.medium;
    case '600':
    case 'semibold':
      return FONT_FAMILY.semibold;
    case '700':
    case '800':
    case '900':
    case 'bold':
    case 'heavy':
    case 'black':
      return FONT_FAMILY.bold;
    default:
      return FONT_FAMILY.regular;
  }
}
