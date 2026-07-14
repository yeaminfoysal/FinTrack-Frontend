import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/providers/theme-provider';

export function ModalShell({ title, children }: { title: string; children: ReactNode }) {
  const { tokens, scheme } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingVertical: 14,
          }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.ink }}>{title}</Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: tokens.surface2,
              borderColor: tokens.line,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: tokens.muted, fontSize: 16 }}>✕</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32, gap: 14 }}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
