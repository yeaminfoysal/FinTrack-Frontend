import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { localDigits } from '@/lib/digits';
import { sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useSessionStore } from '@/stores/session';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD = 8;

type FieldErrors = { name?: string; email?: string; password?: string };

export default function RegisterScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const register = useSessionStore((s) => s.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [opening, setOpening] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: FieldErrors = {
      name: name.trim() ? undefined : 'আপনার নাম লিখুন।',
      email: EMAIL_RE.test(email.trim()) ? undefined : 'সঠিক ইমেইল ঠিকানা দিন।',
      password:
        password.length >= MIN_PASSWORD ? undefined : `পাসওয়ার্ড কমপক্ষে ${localDigits(MIN_PASSWORD)} অক্ষরের হতে হবে।`,
    };
    setErrors(next);
    setFormError(null);
    if (next.name || next.email || next.password) return;

    try {
      setLoading(true);
      await register(email.trim(), password, name.trim(), toPaisa(opening || '0'));
    } catch (e) {
      setFormError(
        isAxiosError(e) && !e.response
          ? 'সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।'
          : isAxiosError(e) && e.response?.status === 409
            ? 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে। লগইন করুন।'
            : 'রেজিস্টার করা যায়নি। একটু পরে আবার চেষ্টা করুন।',
      );
    } finally {
      setLoading(false);
    }
  };

  const toLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <AuthShell title="নতুন অ্যাকাউন্ট" subtitle="শুরু করতে কিছু তথ্য দিন">
      <View style={{ gap: 14 }}>
        <Field
          label="নাম"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErrors((e) => ({ ...e, name: undefined }));
          }}
          placeholder="আপনার নাম"
          autoCapitalize="words"
          autoComplete="name"
          maxLength={120}
          error={errors.name}
        />
        <Field
          label="ইমেইল"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setErrors((e) => ({ ...e, email: undefined }));
          }}
          placeholder="you@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
        />
        <Field
          label="পাসওয়ার্ড"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setErrors((e) => ({ ...e, password: undefined }));
          }}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={128}
          hint={`কমপক্ষে ${localDigits(MIN_PASSWORD)} অক্ষর`}
          error={errors.password}
        />
        <Field
          label="শুরুর সেভিংস (ঐচ্ছিক)"
          value={opening}
          onChangeText={(v) => setOpening(sanitizeAmountInput(v))}
          placeholder="0"
          keyboardType="decimal-pad"
          prefix="৳"
          hint="এখন হাতে, ব্যাংকে ও মোবাইল ব্যাংকিংয়ে মোট যত টাকা আছে। পরে সেটিংস থেকে বদলানো যাবে।"
        />

        {formError ? <Notice text={formError} /> : null}
        <Button label="রেজিস্টার করুন" onPress={() => void submit()} loading={loading} style={{ marginTop: 4 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4, gap: 5 }}>
          <Text style={{ color: tokens.muted, fontSize: textSize.md }}>ইতিমধ্যে অ্যাকাউন্ট আছে?</Text>
          <Pressable onPress={toLogin} accessibilityRole="link" hitSlop={10} style={{ paddingVertical: 4 }}>
            <Text style={{ color: tokens.primary, fontSize: textSize.md, fontWeight: '700' }}>লগইন</Text>
          </Pressable>
        </View>
      </View>
    </AuthShell>
  );
}
