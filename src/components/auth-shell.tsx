import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useTheme } from '@/providers/theme-provider';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { tokens, scheme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, width: '100%', maxWidth: 480, alignSelf: 'center' }}
            keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 18,
                  backgroundColor: tokens.primaryFill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}>
                <Text style={{ color: tokens.onFill, fontSize: textSize.display, fontWeight: '700' }}>৳</Text>
              </View>
              <Text accessibilityRole="header" style={{ fontSize: textSize.xl, fontWeight: '700', color: tokens.ink }}>
                {title}
              </Text>
              <Text style={{ fontSize: textSize.md, lineHeight: 21, color: tokens.muted, marginTop: 6, textAlign: 'center' }}>
                {subtitle}
              </Text>
            </View>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
