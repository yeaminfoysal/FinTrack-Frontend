/**
 * The reminder switches in Settings. Turning one on asks for notification permission;
 * a refusal leaves the switch off rather than pretending it worked.
 */
import { useEffect } from 'react';
import { Switch, View } from 'react-native';

import { ChipSelect, type ChipOption } from '@/components/ui/chip-select';
import { Card } from '@/components/ui/card';
import { FieldLabel } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { withAlpha } from '@/constants/tokens';
import { textSize } from '@/constants/typography';
import { notificationsAvailable, notificationsOnWeb, timeLabelBn } from '@/lib/notifications';
import { useTheme } from '@/providers/theme-provider';
import { useRemindersStore } from '@/stores/reminders';
import { showToast } from '@/stores/ui';

/** The times people actually want a nudge: after work, after dinner, before bed. */
const TIME_CHOICES = [18 * 60, 20 * 60, 21 * 60, 22 * 60];

const TIME_OPTIONS: ChipOption[] = TIME_CHOICES.map((minutes) => ({
  key: String(minutes),
  label: timeLabelBn(minutes),
}));

export function ReminderSettings() {
  const { tokens } = useTheme();
  const load = useRemindersStore((s) => s.load);
  const update = useRemindersStore((s) => s.update);
  const dailyEnabled = useRemindersStore((s) => s.dailyEnabled);
  const dailyMinutes = useRemindersStore((s) => s.dailyMinutes);
  const loanDueEnabled = useRemindersStore((s) => s.loanDueEnabled);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (patch: { dailyEnabled?: boolean; loanDueEnabled?: boolean }) => {
    const ok = await update(patch);
    if (!ok) {
      showToast({
        tone: 'error',
        message: 'নোটিফিকেশনের অনুমতি পাওয়া যায়নি। ফোনের সেটিংস থেকে অনুমতি দিন।',
      });
    }
  };

  if (!notificationsAvailable()) {
    return (
      <Card soft>
        <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted }}>
          {notificationsOnWeb
            ? 'রিমাইন্ডার শুধু ফোনের অ্যাপে কাজ করে — ব্রাউজারে নয়।'
            : 'Expo Go-তে নোটিফিকেশন কাজ করে না। ডেভেলপমেন্ট বিল্ড (npx expo run:android) বা রিলিজ বিল্ডে রিমাইন্ডার চালু করা যাবে।'}
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 14 }}>
      <ToggleRow
        title="আজকের খরচ লিখেছেন?"
        subtitle="প্রতিদিন একবার মনে করিয়ে দেবে। যেদিন খরচ লেখা হয়ে গেছে, সেদিন আসবে না।"
        value={dailyEnabled}
        onChange={(next) => void toggle({ dailyEnabled: next })}
      />

      {dailyEnabled ? (
        <View style={{ gap: 7 }}>
          <FieldLabel>কখন</FieldLabel>
          <ChipSelect
            scroll
            options={TIME_OPTIONS}
            value={String(dailyMinutes)}
            onChange={(key) => void update({ dailyMinutes: Number(key) })}
            accessibilityLabel="রিমাইন্ডারের সময়"
          />
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: tokens.line }} />

      <ToggleRow
        title="লোন ফেরতের তারিখ"
        subtitle="যেদিন কারো টাকা ফেরত পাওয়ার বা শোধ করার কথা, সেদিন সকালে জানাবে।"
        value={loanDueEnabled}
        onChange={(next) => void toggle({ loanDueEnabled: next })}
      />
    </Card>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: textSize.md, fontWeight: '600', color: tokens.ink }}>{title}</Text>
        <Text style={{ fontSize: textSize.sm, lineHeight: 19, color: tokens.muted }}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ false: tokens.chip, true: withAlpha(tokens.primary, 0.5) }}
        thumbColor={value ? tokens.primary : tokens.surface}
        ios_backgroundColor={tokens.chip}
      />
    </View>
  );
}
