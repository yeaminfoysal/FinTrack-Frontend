import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ModalShell } from '@/components/modal-shell';
import { AmountText } from '@/components/ui/amount-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { toPaisa, toTaka } from '@/lib/money';
import { useTheme, type ThemePreference } from '@/providers/theme-provider';
import { useDataStore } from '@/stores/data';
import { useSessionStore } from '@/stores/session';

export default function SettingsScreen() {
  const { tokens, preference, setPreference } = useTheme();
  const profile = useDataStore((s) => s.profile);
  const updateProfile = useDataStore((s) => s.updateProfile);
  const logout = useSessionStore((s) => s.logout);

  const [name, setName] = useState(profile.name);
  const [opening, setOpening] = useState(String(toTaka(profile.openingSavings)));

  const saveProfile = () => {
    updateProfile({ name: name.trim() || profile.name, openingSavings: toPaisa(opening || '0') });
  };

  return (
    <ModalShell title="সেটিংস">
      {/* Profile */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: tokens.surface2,
            borderColor: tokens.line,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontWeight: '700', color: tokens.primary, fontSize: 18 }}>{profile.name.slice(0, 2)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.ink }}>{profile.name}</Text>
          <Text style={{ fontSize: 12.5, color: tokens.muted }}>{profile.email || 'ইমেইল নেই'}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(19,138,87,0.12)',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 999,
          }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.income }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: tokens.income }}>Synced</Text>
        </View>
      </Card>

      {/* Editable profile */}
      <SettingGroup label="প্রোফাইল">
        <Field label="নাম" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="ওপেনিং সেভিংস (৳)" value={opening} onChangeText={setOpening} keyboardType="numeric" prefix="৳" />
        <Button label="সেভ করুন" onPress={saveProfile} style={{ marginTop: 2 }} />
      </SettingGroup>

      {/* Preferences */}
      <SettingGroup label="থিম">
        <Segmented
          options={[
            { value: 'light', label: 'লাইট' },
            { value: 'dark', label: 'ডার্ক' },
            { value: 'system', label: 'অটো' },
          ]}
          value={preference}
          onChange={(v) => setPreference(v as ThemePreference)}
        />
      </SettingGroup>

      {/* Account meta */}
      <SettingGroup label="অ্যাকাউন্ট">
        <MetaRow label="কারেন্সি" value={profile.currency} tokens={tokens} />
        <Divider />
        <MetaRow label="টাইমজোন" value={profile.timezone} tokens={tokens} />
        <Divider />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ fontSize: 13.5, color: tokens.muted }}>ওপেনিং সেভিংস</Text>
          <AmountText paisa={profile.openingSavings} size={14} color={tokens.ink} />
        </View>
      </SettingGroup>

      <Button label="লগ আউট" variant="outline" color={tokens.expense} onPress={() => logout()} style={{ marginTop: 4 }} />
      <Text style={{ textAlign: 'center', fontSize: 11, color: tokens.muted, marginTop: 14 }}>
        FinTrack · Offline-first · v1.0.0
      </Text>
    </ModalShell>
  );
}

function SettingGroup({ label, children }: { label: string; children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: tokens.muted, marginLeft: 2, marginTop: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function MetaRow({ label, value, tokens }: { label: string; value: string; tokens: ReturnType<typeof useTheme>['tokens'] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
      <Text style={{ fontSize: 13.5, color: tokens.muted }}>{label}</Text>
      <Text style={{ fontSize: 13.5, fontWeight: '600', color: tokens.ink }}>{value}</Text>
    </View>
  );
}

function Divider() {
  const { tokens } = useTheme();
  return <View style={{ height: 1, backgroundColor: tokens.line }} />;
}
