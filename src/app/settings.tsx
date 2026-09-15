import Constants from 'expo-constants';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { SyncBadge } from '@/components/sync-badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { relativeTimeBn } from '@/lib/date';
import { localDigits } from '@/lib/digits';
import { amountInputFromPaisa, formatTaka, sanitizeAmountInput, toPaisa } from '@/lib/money';
import { useTheme, type ThemePreference } from '@/providers/theme-provider';
import { countPending, useDataStore } from '@/stores/data';
import { useSessionStore } from '@/stores/session';
import { useSyncStore } from '@/stores/sync';
import { confirmDialog, showToast } from '@/stores/ui';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'লাইট' },
  { value: 'dark', label: 'ডার্ক' },
  { value: 'system', label: 'অটো' },
];

export default function SettingsScreen() {
  const { tokens, preference, setPreference } = useTheme();
  const profile = useDataStore((s) => s.profile);
  const logout = useSessionStore((s) => s.logout);
  const sync = useSyncStatus();
  const [loggingOut, setLoggingOut] = useState(false);

  const signOut = async () => {
    const pendingNow = countPending(useDataStore.getState());
    const confirmed = await confirmDialog({
      title: 'লগআউট করবেন?',
      message: sync.isDemo
        ? 'ডেমো থেকে বের হবেন। ডেমোর ডেটা সার্ভারে যায় না।'
        : pendingNow > 0
          ? `${localDigits(pendingNow)}টি এন্ট্রি এখনো সার্ভারে যায়নি। লগআউটের আগে সিঙ্ক করার চেষ্টা করা হবে।`
          : 'আবার লগইন করলে আপনার সব ডেটা ফিরে আসবে।',
      confirmLabel: 'লগআউট',
      destructive: true,
    });
    if (!confirmed) return;

    setLoggingOut(true);
    if (!sync.isDemo && pendingNow > 0) {
      await useSyncStore.getState().push();
      const stillPending = countPending(useDataStore.getState());
      if (stillPending > 0) {
        const force = await confirmDialog({
          title: 'সিঙ্ক করা যায়নি',
          message: `${localDigits(stillPending)}টি এন্ট্রি এখনো সার্ভারে যায়নি (ইন্টারনেট আছে কি?)। এই অ্যাকাউন্টেই আবার লগইন করলে এগুলো থাকবে, কিন্তু অন্য অ্যাকাউন্টে লগইন করলে মুছে যাবে।`,
          confirmLabel: 'তবুও লগআউট',
          cancelLabel: 'থাকুন',
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
    <ModalShell title="সেটিংস">
      {/* Profile */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={profile.name} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: tokens.ink }}>
            {profile.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: tokens.muted }}>
            {profile.email || 'ইমেইল নেই'}
          </Text>
        </View>
      </Card>

      {/* Sync */}
      <SettingGroup label="সিঙ্ক">
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <SyncBadge />
            {sync.lastSyncedAt ? (
              <Text style={{ fontSize: 12.5, color: tokens.muted }}>শেষ সিঙ্ক: {relativeTimeBn(sync.lastSyncedAt)}</Text>
            ) : null}
          </View>
          <Text style={{ fontSize: 13, lineHeight: 20, color: tokens.muted }}>
            {sync.isDemo
              ? 'ডেমো মোডে ডেটা শুধু এই ডিভাইসে থাকে, সার্ভারে যায় না।'
              : 'সব এন্ট্রি আগে এই ডিভাইসে সেভ হয়; ইন্টারনেট পেলে নিজে থেকেই সার্ভারে যায়।'}
          </Text>
          {!sync.isDemo ? (
            <Button
              label="এখনই সিঙ্ক করুন"
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
      <SettingGroup label="প্রোফাইল">
        {/* Remount when the stored profile changes (loaded from storage, pulled from the
            server) so the fields never keep stale values that a save would write back. */}
        <ProfileForm key={`${profile.name}|${profile.openingSavings}`} />
      </SettingGroup>

      {/* Preferences */}
      <SettingGroup label="থিম">
        <Segmented options={THEME_OPTIONS} value={preference} onChange={setPreference} accessibilityLabel="থিম" />
      </SettingGroup>

      {/* Account info (read-only) */}
      <SettingGroup label="অ্যাকাউন্টের তথ্য">
        <Card soft style={{ gap: 8 }}>
          <InfoRow label="মুদ্রা" value={profile.currency === 'BDT' ? 'বাংলাদেশি টাকা (৳)' : profile.currency} />
          <InfoRow label="সময় অঞ্চল" value="ফোনের সময় অনুযায়ী" />
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: tokens.muted }}>
            মাসের শুরু-শেষ আপনার ফোনের সময় ধরে হিসাব হয়।
          </Text>
        </Card>
      </SettingGroup>

      <Button
        label="লগ আউট"
        icon="log-out-outline"
        variant="outline"
        color={tokens.expense}
        loading={loggingOut}
        onPress={() => void signOut()}
        style={{ marginTop: 4 }}
      />
      <Text style={{ textAlign: 'center', fontSize: 12, color: tokens.muted, marginTop: 6 }}>
        FinTrack · সংস্করণ {localDigits(Constants.expoConfig?.version ?? '1.0.0')}
      </Text>
    </ModalShell>
  );
}

function ProfileForm() {
  const profile = useDataStore((s) => s.profile);
  const editProfile = useDataStore((s) => s.editProfile);
  const [name, setName] = useState(profile.name);
  const [opening, setOpening] = useState(amountInputFromPaisa(profile.openingSavings));
  const [nameError, setNameError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('নাম লিখুন।');
      return;
    }
    const openingPaisa = toPaisa(opening || '0');
    if (openingPaisa !== profile.openingSavings) {
      const confirmed = await confirmDialog({
        title: 'শুরুর সেভিংস বদলাবেন?',
        message: `${formatTaka(profile.openingSavings)} থেকে ${formatTaka(openingPaisa)} হবে। প্রথম মাস থেকে সব মাসের ওপেনিং, সঞ্চয় ও ক্লোজিং আবার হিসাব হবে।`,
        confirmLabel: 'বদলান',
      });
      if (!confirmed) return;
    }
    editProfile({ name: trimmed, openingSavings: openingPaisa });
    showToast({ message: 'প্রোফাইল সেভ হয়েছে' });
  };

  return (
    <>
      <Field
        label="নাম"
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
        label="শুরুর সেভিংস (প্রথম মাস)"
        value={opening}
        onChangeText={(v) => setOpening(sanitizeAmountInput(v))}
        keyboardType="decimal-pad"
        prefix="৳"
        hint="অ্যাপ ব্যবহার শুরুর দিন হাতে, ব্যাংকে ও মোবাইল ব্যাংকিংয়ে মোট যত টাকা ছিল। এটা বদলালে সব মাসের হিসাব আবার গণনা হবে।"
      />
      <Button label="প্রোফাইল সেভ করুন" icon="checkmark" onPress={() => void save()} />
    </>
  );
}

function SettingGroup({ label, children }: { label: string; children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: '700', color: tokens.muted, marginLeft: 2, marginTop: 6 }}>
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
      <Text style={{ fontSize: 13.5, color: tokens.muted }}>{label}</Text>
      <Text style={{ flexShrink: 1, textAlign: 'right', fontSize: 13.5, fontWeight: '600', color: tokens.ink }}>{value}</Text>
    </View>
  );
}
