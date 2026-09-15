import { isAxiosError } from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/providers/theme-provider';
import { useSessionStore } from '@/stores/session';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
/** The offline demo is for development/test builds; EXPO_PUBLIC_ENABLE_DEMO=true shows it in other builds. */
const SHOW_DEMO = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEMO === 'true';

export default function LoginScreen() {
  const { tokens } = useTheme();
  const login = useSessionStore((s) => s.login);
  const loginDemo = useSessionStore((s) => s.loginDemo);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const address = email.trim();
    const badEmail = EMAIL_RE.test(address) ? null : 'সঠিক ইমেইল ঠিকানা দিন।';
    const badPassword = password ? null : 'পাসওয়ার্ড দিন।';
    setEmailError(badEmail);
    setPasswordError(badPassword);
    setFormError(null);
    if (badEmail || badPassword) return;

    try {
      setLoading(true);
      await login(address, password);
    } catch (e) {
      setFormError(
        isAxiosError(e) && !e.response
          ? 'সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।'
          : isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 400)
            ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।'
            : 'লগইন করা যায়নি। একটু পরে আবার চেষ্টা করুন।',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="FinTrack" subtitle="আপনার অ্যাকাউন্টে লগইন করুন">
      <View style={{ gap: 14 }}>
        <Field
          label="ইমেইল"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setEmailError(null);
          }}
          placeholder="you@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          error={emailError}
        />
        <Field
          label="পাসওয়ার্ড"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setPasswordError(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          error={passwordError}
        />

        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link" hitSlop={10} style={{ alignSelf: 'flex-end', paddingVertical: 4 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: tokens.primary }}>পাসওয়ার্ড ভুলে গেছেন?</Text>
          </Pressable>
        </Link>

        {formError ? <Notice text={formError} /> : null}
        <Button label="লগইন করুন" onPress={() => void submit()} loading={loading} style={{ marginTop: 4 }} />
        {SHOW_DEMO ? <Button label="ডেমো হিসেবে চালিয়ে যান" variant="outline" onPress={() => void loginDemo()} /> : null}

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 5 }}>
          <Text style={{ color: tokens.muted, fontSize: 14 }}>অ্যাকাউন্ট নেই?</Text>
          <Link href="/register" asChild>
            <Pressable accessibilityRole="link" hitSlop={10} style={{ paddingVertical: 4 }}>
              <Text style={{ color: tokens.primary, fontSize: 14, fontWeight: '700' }}>রেজিস্টার করুন</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
