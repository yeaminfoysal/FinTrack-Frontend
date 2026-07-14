import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useTheme } from '@/providers/theme-provider';
import { useSessionStore } from '@/stores/session';

export default function LoginScreen() {
  const { tokens } = useTheme();
  const login = useSessionStore((s) => s.login);
  const loginDemo = useSessionStore((s) => s.loginDemo);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('তথ্য দিন', 'ইমেইল ও পাসওয়ার্ড দিন।');
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch {
      Alert.alert('লগইন ব্যর্থ', 'ইমেইল/পাসওয়ার্ড সঠিক নয় বা সার্ভারে সংযোগ করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="FinTrack" subtitle="আপনার অ্যাকাউন্টে লগইন করুন">
      <View style={{ gap: 14 }}>
        <Field label="ইমেইল" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="পাসওয়ার্ড" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoCapitalize="none" />

        <Link href="/forgot-password" asChild>
          <Pressable style={{ alignSelf: 'flex-end' }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: tokens.primary }}>পাসওয়ার্ড ভুলে গেছেন?</Text>
          </Pressable>
        </Link>

        <Button label="লগইন করুন" onPress={submit} loading={loading} style={{ marginTop: 4 }} />
        <Button label="ডেমো হিসেবে চালিয়ে যান" variant="outline" onPress={() => loginDemo()} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 5 }}>
          <Text style={{ color: tokens.muted, fontSize: 13 }}>অ্যাকাউন্ট নেই?</Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text style={{ color: tokens.primary, fontSize: 13, fontWeight: '700' }}>রেজিস্টার করুন</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
