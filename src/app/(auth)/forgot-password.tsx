import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AuthApi } from '@/lib/api/endpoints';
import { localDigits, toLatinDigits } from '@/lib/digits';
import { useTheme } from '@/providers/theme-provider';

/** email → emailed 6-digit code → new password → done */
type Step = 'email' | 'code' | 'password' | 'done';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD = 8;
// Backend throttles reset emails to one per ~50s; stay a little slower.
const RESEND_COOLDOWN_S = 60;

const OFFLINE_MESSAGE = 'সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।';

function errorMessage(e: unknown, fallback: string): string {
  return isAxiosError(e) && !e.response ? OFFLINE_MESSAGE : fallback;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  // Inline (not Alert) so messages also show on web.
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const goTo = (next: Step) => {
    setStep(next);
    setError(null);
    setInfo(null);
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  const sendCode = async () => {
    const address = email.trim();
    if (!EMAIL_RE.test(address)) {
      setError('সঠিক ইমেইল ঠিকানা দিন।');
      return;
    }
    const isResend = step === 'code';
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await AuthApi.forgotPassword(address);
      goTo('code');
      setCode('');
      setCooldown(RESEND_COOLDOWN_S);
      if (isResend) setInfo('নতুন কোড পাঠানো হয়েছে।');
    } catch (e) {
      setError(errorMessage(e, 'কোড পাঠানো যায়নি। আবার চেষ্টা করুন।'));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError(`ইমেইলে পাওয়া ${localDigits(6)} সংখ্যার কোডটি দিন।`);
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await AuthApi.verifyResetCode(email.trim(), code);
      setResetToken(res.resetToken);
      goTo('password');
    } catch (e) {
      setError(errorMessage(e, 'কোডটি ভুল অথবা মেয়াদ শেষ। প্রয়োজনে নতুন কোড নিন।'));
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (password.length < MIN_PASSWORD) {
      setError(`পাসওয়ার্ড কমপক্ষে ${localDigits(MIN_PASSWORD)} অক্ষরের হতে হবে।`);
      return;
    }
    if (password !== confirm) {
      setError('দুটি পাসওয়ার্ড মিলছে না।');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await AuthApi.resetPassword(resetToken, password);
      setPassword('');
      setConfirm('');
      setResetToken('');
      goTo('done');
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 400) {
        // The verified window lapsed — only a fresh code can continue.
        goTo('email');
        setError('সময় শেষ হয়ে গেছে। নতুন কোড নিয়ে আবার চেষ্টা করুন।');
      } else {
        setError(errorMessage(e, 'পাসওয়ার্ড সেট করা যায়নি। আবার চেষ্টা করুন।'));
      }
    } finally {
      setLoading(false);
    }
  };

  const subtitle = {
    email: `অ্যাকাউন্টের ইমেইল দিন — সেখানে একটি ${localDigits(6)} সংখ্যার যাচাই কোড পাঠানো হবে`,
    code: `${email.trim()} ঠিকানায় পাঠানো ${localDigits(6)} সংখ্যার কোডটি দিন`,
    password: 'ইমেইল যাচাই হয়েছে — এবার নতুন পাসওয়ার্ড দিন',
    done: 'আপনার পাসওয়ার্ড পরিবর্তন হয়েছে',
  }[step];

  const notice = error ? <Notice text={error} /> : info ? <Notice text={info} tone="success" /> : null;

  return (
    <AuthShell title="পাসওয়ার্ড রিসেট" subtitle={subtitle}>
      <View style={{ gap: 14 }}>
        {step === 'email' && (
          <>
            <Field
              label="ইমেইল"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => void sendCode()}
            />
            {notice}
            <Button label="কোড পাঠান" onPress={() => void sendCode()} loading={loading} style={{ marginTop: 4 }} />
            <Button label="ফিরে যান" variant="ghost" onPress={leave} />
          </>
        )}

        {step === 'code' && (
          <>
            <Field
              label="যাচাই কোড"
              value={code}
              onChangeText={(v) => setCode(toLatinDigits(v).replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={() => void verifyCode()}
              hint="ইমেইল না পেলে Spam বা Promotions ফোল্ডার দেখুন।"
            />
            {notice}
            <Button label="কোড যাচাই করুন" onPress={() => void verifyCode()} loading={loading} style={{ marginTop: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingHorizontal: 2 }}>
              <TextLink label="ইমেইল পরিবর্তন" onPress={() => goTo('email')} disabled={loading} />
              <TextLink
                label={cooldown > 0 ? `আবার পাঠানো যাবে ${localDigits(cooldown)} সেকেন্ড পরে` : 'কোড আবার পাঠান'}
                onPress={() => void sendCode()}
                disabled={cooldown > 0 || loading}
              />
            </View>
          </>
        )}

        {step === 'password' && (
          <>
            <Field
              label="নতুন পাসওয়ার্ড"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              maxLength={128}
              autoComplete="new-password"
              textContentType="newPassword"
              hint={`কমপক্ষে ${localDigits(MIN_PASSWORD)} অক্ষর`}
            />
            <Field
              label="পাসওয়ার্ড নিশ্চিত করুন"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="আবার লিখুন"
              secureTextEntry
              autoCapitalize="none"
              maxLength={128}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void savePassword()}
            />
            {notice}
            <Button label="পাসওয়ার্ড সেট করুন" onPress={() => void savePassword()} loading={loading} style={{ marginTop: 4 }} />
            <Button label="বাতিল" variant="ghost" onPress={leave} />
          </>
        )}

        {step === 'done' && (
          <>
            <Notice tone="success" text="নতুন পাসওয়ার্ড দিয়ে লগইন করুন। নিরাপত্তার জন্য সব ডিভাইস থেকে লগআউট করা হয়েছে।" />
            <Button label="লগইন করুন" onPress={() => router.replace('/login')} style={{ marginTop: 4 }} />
          </>
        )}
      </View>
    </AuthShell>
  );
}

function TextLink({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={10}
      style={{ paddingVertical: 6 }}>
      <Text style={{ fontSize: 13.5, fontWeight: '600', color: disabled ? tokens.muted : tokens.primary }}>{label}</Text>
    </Pressable>
  );
}
