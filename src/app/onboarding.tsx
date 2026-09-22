/**
 * First run. Three screens: what the app does, how much money is in hand right now, and
 * how the gap between the records and that money becomes "আনট্র্যাকড খরচ".
 *
 * The middle step matters most — every figure in the app is built on the opening balance,
 * and counting the money on day one makes the reconciliation right from the first entry.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { PageTitle } from '@/components/page-title';
import { radii, withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { currentMonthKey } from '@/lib/date';
import { isPlaceholderName, useStrings } from '@/lib/i18n';
import { formatTaka, sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';

const STEPS = 3;

export default function OnboardingScreen() {
  const { tokens } = useTheme();
  const t = useStrings().onboarding;
  const router = useRouter();
  const profile = useDataStore((s) => s.profile);
  const editProfile = useDataStore((s) => s.editProfile);
  const setPractical = useDataStore((s) => s.setPractical);
  const completeOnboarding = useDataStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [total, setTotal] = useState('');
  const paisa = toPaisa(total || '0');

  const finish = () => {
    completeOnboarding();
    router.replace('/');
  };

  const saveAndNext = () => {
    if (paisa > 0) {
      editProfile({ openingSavings: paisa });
      // Counted today, so the balance and the records agree from the very first entry.
      setPractical(currentMonthKey(), { cash: paisa, bank: 0, mfs: 0 });
    }
    setStep(2);
  };

  return (
    <Screen padBottom={28}>
      <PageTitle title={t.pageTitle} />

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 26 }}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= step ? tokens.primary : tokens.line,
            }}
          />
        ))}
      </View>

      {step === 0 ? <Welcome name={profile.name} /> : null}
      {step === 1 ? (
        <CountMoney value={total} onChange={(v) => setTotal(sanitizeAmountInput(v))} paisa={paisa} />
      ) : null}
      {step === 2 ? <HowItReconciles opening={profile.openingSavings} /> : null}

      <View style={{ gap: 10, marginTop: 28 }}>
        {step === 0 ? <Button label={t.start} icon="arrow-forward" onPress={() => setStep(1)} /> : null}
        {step === 1 ? (
          <>
            <Button label={paisa > 0 ? t.saveAndNext : t.next} icon="arrow-forward" onPress={saveAndNext} />
            {paisa > 0 ? null : (
              <Text style={{ textAlign: 'center', fontSize: textSize.sm, color: tokens.muted }}>
                {t.skipNote}
              </Text>
            )}
          </>
        ) : null}
        {step === 2 ? <Button label={t.finish} icon="checkmark" onPress={finish} /> : null}

        {step > 0 ? (
          <Button label={t.goBack} variant="ghost" onPress={() => setStep(step - 1)} />
        ) : (
          <Button label={t.skip} variant="ghost" onPress={finish} />
        )}
      </View>
    </Screen>
  );
}

function Welcome({ name }: { name: string }) {
  const { tokens } = useTheme();
  const t = useStrings().onboarding;
  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          alignSelf: 'flex-start',
          width: 56,
          height: 56,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.primaryFill,
        }}>
        <Icon name="wallet" size={28} color={tokens.onFill} />
      </View>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ fontSize: textSize.display, fontWeight: '700', color: tokens.ink, lineHeight: 42 }}>
          {name && !isPlaceholderName(name) ? t.welcomeNamed(name) : t.welcome}
        </Text>
        <Text style={{ fontSize: textSize.lg, lineHeight: 26, color: tokens.muted }}>{t.tagline}</Text>
      </View>
      <View style={{ gap: 12, marginTop: 4 }}>
        <Point icon="arrow-up-circle-outline" title={t.pointIncomeTitle} text={t.pointIncomeText} />
        <Point icon="people-outline" title={t.pointLoanTitle} text={t.pointLoanText} />
        <Point icon="help-circle-outline" title={t.pointUntrackedTitle} text={t.pointUntrackedText} />
      </View>
    </View>
  );
}

function Point({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(tokens.primary, 0.12),
        }}>
        <Icon name={icon} size={20} color={tokens.primary} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontSize: textSize.md, fontWeight: '700', color: tokens.ink }}>{title}</Text>
        <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted }}>{text}</Text>
      </View>
    </View>
  );
}

function CountMoney({ value, onChange, paisa }: { value: string; onChange: (v: string) => void; paisa: number }) {
  const { tokens } = useTheme();
  const t = useStrings().onboarding;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ fontSize: textSize.xl, fontWeight: '700', color: tokens.ink }}>
          {t.howMuchTitle}
        </Text>
        <Text style={{ fontSize: textSize.md, lineHeight: 23, color: tokens.muted }}>{t.howMuchText}</Text>
      </View>

      <Field
        label={t.totalLabel}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        prefix="৳"
        placeholder="0"
        autoFocus
        hint={t.totalHint}
      />

      {paisa > 0 ? (
        <Card soft padding={15} style={{ flexDirection: 'row', gap: 12 }}>
          <Icon name="checkmark-circle" size={20} color={tokens.income} />
          <Text style={{ flex: 1, fontSize: textSize.sm, lineHeight: 20, color: tokens.muted }}>
            {t.openingPrefix}
            <Text style={{ fontWeight: '700', color: tokens.ink }}>{formatTaka(paisa)}</Text>
            {t.openingSuffix}
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

function HowItReconciles({ opening }: { opening: number }) {
  const { tokens } = useTheme();
  const t = useStrings().onboarding;
  // A worked example beats a definition: the same three lines the reconcile sheet shows.
  const start = opening > 0 ? opening : 1000000;
  const spent = Math.round(start * 0.2);
  const theoretical = start - spent;
  const practical = theoretical - Math.round(start * 0.05);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ fontSize: textSize.xl, fontWeight: '700', color: tokens.ink }}>
          {t.untrackedTitle}
        </Text>
        <Text style={{ fontSize: textSize.md, lineHeight: 23, color: tokens.muted }}>{t.untrackedText}</Text>
      </View>

      <Card padding={16} style={{ gap: 9 }}>
        <ExampleRow label={t.exampleStart} value={formatTaka(start)} />
        <ExampleRow label={t.exampleSpent} value={`− ${formatTaka(spent)}`} color={tokens.expense} />
        <View style={{ height: 1, backgroundColor: tokens.line, marginVertical: 3 }} />
        <ExampleRow label={t.exampleTheoretical} value={formatTaka(theoretical)} strong />
        <ExampleRow label={t.examplePractical} value={formatTaka(practical)} strong />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 6,
            padding: 12,
            borderRadius: radii.md,
            backgroundColor: withAlpha(tokens.borrowed, 0.12),
          }}>
          <Icon name="help-circle-outline" size={20} color={tokens.borrowed} />
          <Text style={{ flex: 1, fontSize: textSize.sm, lineHeight: 19, color: tokens.ink }}>
            {t.examplePrefix}
            <Text style={{ fontWeight: '700', color: tokens.borrowed }}>{formatTaka(theoretical - practical)}</Text>
            {t.exampleSuffix}
          </Text>
        </View>
      </Card>

      <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted, marginLeft: 2 }}>
        {t.footer}
      </Text>
    </View>
  );
}

function ExampleRow({ label, value, color, strong }: { label: string; value: string; color?: string; strong?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ fontSize: textSize.md, fontWeight: strong ? '600' : '400', color: strong ? tokens.ink : tokens.muted }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: textSize.md,
          fontWeight: strong ? '700' : '600',
          color: color ?? tokens.ink,
          fontVariant: ['tabular-nums'],
        }}>
        {value}
      </Text>
    </View>
  );
}
