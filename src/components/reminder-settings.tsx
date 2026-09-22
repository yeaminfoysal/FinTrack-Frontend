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
import { useStrings } from '@/lib/i18n';
import { notificationsAvailable, notificationsOnWeb, timeLabel } from '@/lib/notifications';
import { useTheme } from '@/providers/theme-provider';
import { useRemindersStore } from '@/stores/reminders';
import { showToast } from '@/stores/ui';

/** The times people actually want a nudge: after work, after dinner, before bed. */
const TIME_CHOICES = [18 * 60, 20 * 60, 21 * 60, 22 * 60];

export function ReminderSettings() {
  const { tokens } = useTheme();
  const t = useStrings().reminders;
  // Built here, not at module load, so the times read in whichever language is set.
  const timeOptions: ChipOption[] = TIME_CHOICES.map((minutes) => ({ key: String(minutes), label: timeLabel(minutes) }));
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
        message: t.permissionDenied,
      });
    }
  };

  if (!notificationsAvailable()) {
    return (
      <Card soft>
        <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted }}>
          {notificationsOnWeb
            ? t.webOnly
            : t.needDevBuild}
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 14 }}>
      <ToggleRow
        title={t.dailyTitle}
        subtitle={t.dailySubtitle}
        value={dailyEnabled}
        onChange={(next) => void toggle({ dailyEnabled: next })}
      />

      {dailyEnabled ? (
        <View style={{ gap: 7 }}>
          <FieldLabel>{t.when}</FieldLabel>
          <ChipSelect
            scroll
            options={timeOptions}
            value={String(dailyMinutes)}
            onChange={(key) => void update({ dailyMinutes: Number(key) })}
            accessibilityLabel={t.timeA11y}
          />
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: tokens.line }} />

      <ToggleRow
        title={t.loanTitle}
        subtitle={t.loanSubtitle}
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
