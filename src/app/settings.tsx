import Constants from 'expo-constants';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { PageTitle } from '@/components/page-title';
import { ReminderSettings } from '@/components/reminder-settings';
import { SyncBadge } from '@/components/sync-badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { fontFamilyFor } from '@/constants/fonts';
import { textSize } from '@/constants/typography';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { relativeTime } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { LANGUAGES, setLanguage, useLanguage, useStrings, type Lang } from '@/lib/i18n';
import { amountInputFromPaisa, formatTaka, sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme, type ThemePreference } from '@/providers/theme-provider';
import { countPending, useDataStore } from '@/stores/data';
import { useSessionStore } from '@/stores/session';
import { useSyncStore } from '@/stores/sync';
import { confirmDialog, showToast } from '@/stores/ui';

/** The developer's site, opened from the credit line at the bottom of this screen. */
const DEVELOPER_URL = 'https://yeamin-foysal.vercel.app';

export default function SettingsScreen() {
  const { tokens, preference, setPreference } = useTheme();
  const strings = useStrings();
  const t = strings.settings;
  const lang = useLanguage();
  const themeOptions = useMemo<{ value: ThemePreference; label: string }[]>(
    () => [
      { value: 'light', label: t.themeLight },
      { value: 'dark', label: t.themeDark },
      { value: 'system', label: t.themeSystem },
    ],
    [t],
  );
  // Each language is offered in its own name, so it reads right whichever one is on.
  const languageOptions = useMemo<{ value: Lang; label: string }[]>(
    () => LANGUAGES.map((value) => ({ value, label: strings.languageName[value] })),
    [strings],
  );
  const router = useRouter();
  const profile = useDataStore((s) => s.profile);
  const logout = useSessionStore((s) => s.logout);
  const sync = useSyncStatus();
  const [loggingOut, setLoggingOut] = useState(false);

  const signOut = async () => {
    const pendingNow = countPending(useDataStore.getState());
    const confirmed = await confirmDialog({
      title: t.logoutTitle,
      message: sync.isDemo
        ? t.logoutDemo
        : pendingNow > 0
          ? t.logoutPending(localDigits(pendingNow))
          : t.logoutClean,
      confirmLabel: t.logoutConfirm,
      destructive: true,
    });
    if (!confirmed) return;

    setLoggingOut(true);
    if (!sync.isDemo && pendingNow > 0) {
      await useSyncStore.getState().push();
      const stillPending = countPending(useDataStore.getState());
      if (stillPending > 0) {
        const force = await confirmDialog({
          title: t.syncFailedTitle,
          message: t.syncFailedMessage(localDigits(stillPending)),
          confirmLabel: t.logoutAnyway,
          cancelLabel: t.stay,
          destructive: true,
        });
        if (!force) {
          setLoggingOut(false);
          return;
        }
      }
    }
    await logout();
  };

  return (
    <ModalShell title={t.title}>
      <PageTitle title={t.title} />
      {/* Profile */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={profile.name} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontSize: textSize.lg, fontWeight: '700', color: tokens.ink }}>
            {profile.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: textSize.sm, color: tokens.muted }}>
            {profile.email || t.noEmail}
          </Text>
        </View>
      </Card>

      {/* Sync */}
      <SettingGroup label={t.syncGroup}>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <SyncBadge />
            {sync.lastSyncedAt ? (
              <Text style={{ fontSize: textSize.sm, color: tokens.muted }}>{t.lastSync(relativeTime(sync.lastSyncedAt))}</Text>
            ) : null}
          </View>
          <Text style={{ fontSize: textSize.sm, lineHeight: 20, color: tokens.muted }}>
            {sync.isDemo ? t.demoNote : t.syncNote}
          </Text>
          {!sync.isDemo ? (
            <Button
              label={t.syncNow}
              icon="sync-outline"
              variant="secondary"
              size="sm"
              loading={sync.isSyncing}
              onPress={() => void sync.syncNow()}
            />
          ) : null}
        </Card>
      </SettingGroup>

      {/* Editable profile */}
      <SettingGroup label={t.profileGroup}>
        {/* Remount when the stored profile changes (loaded from storage, pulled from the
            server) so the fields never keep stale values that a save would write back. */}
        <ProfileForm key={`${profile.name}|${profile.openingSavings}`} />
      </SettingGroup>

      {/* Entry helpers */}
      <SettingGroup label={t.entryGroup}>
        <ListGroup>
          <ListRow
            title={t.categoriesRow}
            subtitle={t.categoriesRowSubtitle}
            icon="pricetags-outline"
            tint={tokens.primary}
            onPress={() => router.push('/categories')}
            trailing={<Icon name="chevron-forward" size={18} color={tokens.muted} />}
          />
          <ListRow
            divider
            title={t.recurringRow}
            subtitle={t.recurringRowSubtitle}
            icon="repeat-outline"
            tint={tokens.primary}
            onPress={() => router.push('/recurring')}
            trailing={<Icon name="chevron-forward" size={18} color={tokens.muted} />}
          />
        </ListGroup>
      </SettingGroup>

      {/* Reminders */}
      <SettingGroup label={t.remindersGroup}>
        <ReminderSettings />
      </SettingGroup>

      {/* Preferences */}
      <SettingGroup label={t.languageGroup}>
        <Segmented options={languageOptions} value={lang} onChange={setLanguage} accessibilityLabel={t.languageGroup} />
        <Text style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.muted, marginLeft: 2 }}>{t.languageNote}</Text>
      </SettingGroup>

      <SettingGroup label={t.themeGroup}>
        <Segmented options={themeOptions} value={preference} onChange={setPreference} accessibilityLabel={t.themeGroup} />
      </SettingGroup>

      {/* Account info (read-only) */}
      <SettingGroup label={t.accountGroup}>
        <Card soft style={{ gap: 8 }}>
          <InfoRow label={t.currency} value={profile.currency === 'BDT' ? t.currencyBdt : profile.currency} />
          <InfoRow label={t.timezone} value={t.timezoneValue} />
          <Text style={{ fontSize: textSize.sm, lineHeight: 18, color: tokens.muted }}>{t.timezoneNote}</Text>
        </Card>
      </SettingGroup>

      <Button
        label={t.logout}
        icon="log-out-outline"
        variant="outline"
        color={tokens.expense}
        loading={loggingOut}
        onPress={() => void signOut()}
        style={{ marginTop: 4 }}
      />
      <Text style={{ textAlign: 'center', fontSize: textSize.xs, color: tokens.muted, marginTop: 6 }}>
        {t.version(localDigits(Constants.expoConfig?.version ?? '1.0.0'))}
      </Text>
      <Text style={{ textAlign: 'center', fontSize: textSize.xs, color: tokens.muted, marginTop: 2 }}>
        {t.developer}
        <Link
          href={DEVELOPER_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: textSize.xs, fontFamily: fontFamilyFor('700'), color: tokens.primary }}>
          Yeamin Foysal
        </Link>
      </Text>
    </ModalShell>
  );
}

function ProfileForm() {
  const t = useStrings().settings;
  const profile = useDataStore((s) => s.profile);
  const editProfile = useDataStore((s) => s.editProfile);
  const [name, setName] = useState(profile.name);
  const [opening, setOpening] = useState(amountInputFromPaisa(profile.openingSavings));
  const [nameError, setNameError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t.nameRequired);
      return;
    }
    const openingPaisa = toPaisa(opening || '0');
    if (openingPaisa !== profile.openingSavings) {
      const confirmed = await confirmDialog({
        title: t.openingChangeTitle,
        message: t.openingChangeMessage(formatTaka(profile.openingSavings), formatTaka(openingPaisa)),
        confirmLabel: t.openingChangeConfirm,
      });
      if (!confirmed) return;
    }
    editProfile({ name: trimmed, openingSavings: openingPaisa });
    showToast({ message: t.profileSaved });
  };

  return (
    <>
      <Field
        label={t.nameLabel}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameError(null);
        }}
        autoCapitalize="words"
        maxLength={120}
        error={nameError}
      />
      <Field
        label={t.openingLabel}
        value={opening}
        onChangeText={(v) => setOpening(sanitizeAmountInput(v))}
        keyboardType="decimal-pad"
        prefix="৳"
        hint={t.openingHint}
      />
      <Button label={t.saveProfile} icon="checkmark" onPress={() => void save()} />
    </>
  );
}

function SettingGroup({ label, children }: { label: string; children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ fontSize: textSize.sm, fontWeight: '700', color: tokens.muted, marginLeft: 2, marginTop: 6 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ fontSize: textSize.md, color: tokens.muted }}>{label}</Text>
      <Text style={{ flexShrink: 1, textAlign: 'right', fontSize: textSize.md, fontWeight: '600', color: tokens.ink }}>{value}</Text>
    </View>
  );
}
