import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
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
import { localDigits } from '@/lib/digits';
import { sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useSessionStore } from '@/stores/session';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD = 8;

type FieldErrors = { name?: string; email?: string; password?: string };

export default function RegisterScreen() {
  const { tokens } = useTheme();
  const t = useStrings().auth;
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
      name: name.trim() ? undefined : t.nameRequired,
      email: EMAIL_RE.test(email.trim()) ? undefined : t.badEmail,
      password:
        password.length >= MIN_PASSWORD ? undefined : t.passwordTooShort(localDigits(MIN_PASSWORD)),
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
          ? t.offline
          : isAxiosError(e) && e.response?.status === 409
            ? t.emailTaken
            : t.registerFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  const toLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <AuthShell title={t.registerTitle} subtitle={t.registerSubtitle}>
      <PageTitle title={t.registerPageTitle} />
      <View style={{ gap: 14 }}>
        <Field
          label={t.name}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErrors((e) => ({ ...e, name: undefined }));
          }}
          placeholder={t.namePlaceholder}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={120}
          error={errors.name}
        />
        <Field
          label={t.email}
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
          label={t.password}
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
          hint={t.minChars(localDigits(MIN_PASSWORD))}
          error={errors.password}
        />
        <Field
          label={t.openingLabel}
          value={opening}
          onChangeText={(v) => setOpening(sanitizeAmountInput(v))}
          placeholder="0"
          keyboardType="decimal-pad"
          prefix="৳"
          hint={t.openingHint}
        />

        {formError ? <Notice text={formError} /> : null}
        <Button label={t.register} onPress={() => void submit()} loading={loading} style={{ marginTop: 4 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4, gap: 5 }}>
          <Text style={{ color: tokens.muted, fontSize: textSize.md }}>{t.haveAccount}</Text>
          <Pressable onPress={toLogin} accessibilityRole="link" hitSlop={10} style={{ paddingVertical: 4 }}>
            <Text style={{ color: tokens.primary, fontSize: textSize.md, fontWeight: '700' }}>{t.loginShort}</Text>
          </Pressable>
        </View>
      </View>
    </AuthShell>
  );
}
