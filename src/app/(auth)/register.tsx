import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useSessionStore } from '@/stores/session';

export default function RegisterScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const register = useSessionStore((s) => s.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [opening, setOpening] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !email || !password) {
      Alert.alert('তথ্য দিন', 'নাম, ইমেইল ও পাসওয়ার্ড দিন।');
      return;
    }
    const openingPaisa = toPaisa(opening || '0');
    try {
      setLoading(true);
      await register(email.trim(), password, name.trim(), openingPaisa);
    } catch {
      Alert.alert('রেজিস্ট্রেশন ব্যর্থ', 'সার্ভারে সংযোগ করা যায়নি অথবা ইমেইলটি ব্যবহৃত হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="নতুন অ্যাকাউন্ট" subtitle="শুরু করতে কিছু তথ্য দিন">
      <View style={{ gap: 14 }}>
        <Field label="নাম" value={name} onChangeText={setName} placeholder="আপনার নাম" autoCapitalize="words" />
        <Field label="ইমেইল" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="পাসওয়ার্ড" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoCapitalize="none" />
        <Field label="ওপেনিং সেভিংস (৳)" value={opening} onChangeText={setOpening} placeholder="0" keyboardType="numeric" prefix="৳" />

        <Button label="রেজিস্টার করুন" onPress={submit} loading={loading} style={{ marginTop: 4 }} />
        <Button label="ফিরে যান" variant="ghost" onPress={() => router.back()} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 4, gap: 5 }}>
          <Text style={{ color: tokens.muted, fontSize: 13 }}>ইতিমধ্যে অ্যাকাউন্ট আছে?</Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={{ color: tokens.primary, fontSize: 13, fontWeight: '700' }}>লগইন</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
