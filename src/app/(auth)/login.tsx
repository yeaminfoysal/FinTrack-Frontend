import { isAxiosError } from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { textSize } from '@/constants/typography';
import { useStrings } from '@/lib/i18n';
import { useTheme } from '@/providers/theme-provider';
import { useSessionStore } from '@/stores/session';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
/** The offline demo is for development/test builds; EXPO_PUBLIC_ENABLE_DEMO=true shows it in other builds. */
const SHOW_DEMO = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEMO === 'true';

export default function LoginScreen() {
  const { tokens } = useTheme();
  const t = useStrings().auth;
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
    const badEmail = EMAIL_RE.test(address) ? null : t.badEmail;
    const badPassword = password ? null : t.passwordRequired;
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
          ? t.offline
          : isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 400)
            ? t.wrongCredentials
            : t.loginFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="FinTrack" subtitle={t.loginSubtitle}>
      <PageTitle title={t.loginPageTitle} />
      <View style={{ gap: 14 }}>
        <Field
          label={t.email}
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
          label={t.password}
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
            <Text style={{ fontSize: textSize.md, fontWeight: '600', color: tokens.primary }}>{t.forgotPassword}</Text>
          </Pressable>
        </Link>

        {formError ? <Notice text={formError} /> : null}
        <Button label={t.login} onPress={() => void submit()} loading={loading} style={{ marginTop: 4 }} />
        {SHOW_DEMO ? <Button label={t.demo} variant="outline" onPress={() => void loginDemo()} /> : null}

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 5 }}>
          <Text style={{ color: tokens.muted, fontSize: textSize.md }}>{t.noAccount}</Text>
          <Link href="/register" asChild>
            <Pressable accessibilityRole="link" hitSlop={10} style={{ paddingVertical: 4 }}>
              <Text style={{ color: tokens.primary, fontSize: textSize.md, fontWeight: '700' }}>{t.register}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
