import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { withAlpha } from '@/constants/tokens';
import { useTheme } from '@/providers/theme-provider';

export default function AddChooser() {
  const { tokens } = useTheme();
  const router = useRouter();

  const options = [
    { key: 'income', label: 'আয়', sub: 'বেতন, ফ্রিল্যান্স, উপহার', icon: '↓', color: tokens.income, href: '/add-income' as const },
    { key: 'expense', label: 'খরচ', sub: 'দৈনন্দিন খরচ যোগ করুন', icon: '↑', color: tokens.expense, href: '/add-expense' as const },
    { key: 'loan', label: 'লোন', sub: 'ধার দেওয়া বা নেওয়া', icon: '⇄', color: tokens.lent, href: '/add-loan' as const },
  ];

  return (
    <ModalShell title="নতুন এন্ট্রি">
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => router.replace(opt.href)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: tokens.surface,
            borderColor: tokens.line,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
          }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: withAlpha(opt.color, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: opt.color, fontSize: 20 }}>{opt.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.ink }}>{opt.label}</Text>
            <Text style={{ fontSize: 12, color: tokens.muted }}>{opt.sub}</Text>
          </View>
          <Text style={{ color: tokens.muted, fontSize: 18 }}>›</Text>
        </Pressable>
      ))}
    </ModalShell>
  );
}
