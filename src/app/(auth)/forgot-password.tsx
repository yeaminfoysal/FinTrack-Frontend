import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { AuthApi } from '@/lib/api/endpoints';
import { localDigits, toLatinDigits } from '@/lib/digits';
import { strings, useStrings } from '@/lib/i18n';
import { useTheme } from '@/providers/theme-provider';

/** email → emailed 6-digit code → new password → done */
type Step = 'email' | 'code' | 'password' | 'done';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD = 8;
// Backend throttles reset emails to one per ~50s; stay a little slower.
const RESEND_COOLDOWN_S = 60;

function errorMessage(e: unknown, fallback: string): string {
  return isAxiosError(e) && !e.response ? strings().auth.offline : fallback;
}

export default function ForgotPasswordScreen() {
  const s = useStrings();
  const str = s.auth;
  const common = s.common;
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
      setError(str.badEmail);
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
      if (isResend) setInfo(str.codeSent);
    } catch (e) {
      setError(errorMessage(e, str.codeSendFailed));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError(str.codeRequired(localDigits(6)));
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
      setError(errorMessage(e, str.codeWrong));
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (password.length < MIN_PASSWORD) {
      setError(str.passwordTooShort(localDigits(MIN_PASSWORD)));
      return;
    }
    if (password !== confirm) {
      setError(str.passwordMismatch);
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
        setError(str.resetExpired);
      } else {
        setError(errorMessage(e, str.resetFailed));
      }
    } finally {
      setLoading(false);
    }
  };

  const subtitle = {
    email: str.stepEmail(localDigits(6)),
    code: str.stepCode(email.trim(), localDigits(6)),
    password: str.stepPassword,
    done: str.stepDone,
  }[step];

  const notice = error ? <Notice text={error} /> : info ? <Notice text={info} tone="success" /> : null;

  return (
    <AuthShell title={str.resetTitle} subtitle={subtitle}>
      <PageTitle title={str.resetTitle} />
      <View style={{ gap: 14 }}>
        {step === 'email' && (
          <>
            <Field
              label={str.email}
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
            <Button label={str.sendCode} onPress={() => void sendCode()} loading={loading} style={{ marginTop: 4 }} />
            <Button label={common.back} variant="ghost" onPress={leave} />
          </>
        )}

        {step === 'code' && (
          <>
            <Field
              label={str.codeLabel}
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
              hint={str.spamHint}
            />
            {notice}
            <Button label={str.verifyCode} onPress={() => void verifyCode()} loading={loading} style={{ marginTop: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingHorizontal: 2 }}>
              <TextLink label={str.changeEmail} onPress={() => goTo('email')} disabled={loading} />
              <TextLink
                label={cooldown > 0 ? str.resendIn(localDigits(cooldown)) : str.resend}
                onPress={() => void sendCode()}
                disabled={cooldown > 0 || loading}
              />
            </View>
          </>
        )}

        {step === 'password' && (
          <>
            <Field
              label={str.newPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              maxLength={128}
              autoComplete="new-password"
              textContentType="newPassword"
              hint={str.minChars(localDigits(MIN_PASSWORD))}
            />
            <Field
              label={str.confirmPassword}
              value={confirm}
              onChangeText={setConfirm}
              placeholder={str.confirmPlaceholder}
              secureTextEntry
              autoCapitalize="none"
              maxLength={128}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void savePassword()}
            />
            {notice}
            <Button label={str.setPassword} onPress={() => void savePassword()} loading={loading} style={{ marginTop: 4 }} />
            <Button label={common.cancel} variant="ghost" onPress={leave} />
          </>
        )}

        {step === 'done' && (
          <>
            <Notice tone="success" text={str.resetDone} />
            <Button label={str.login} onPress={() => router.replace('/login')} style={{ marginTop: 4 }} />
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
      <Text style={{ fontSize: textSize.md, fontWeight: '600', color: disabled ? tokens.muted : tokens.primary }}>{label}</Text>
    </Pressable>
  );
}
