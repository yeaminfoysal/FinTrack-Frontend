import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { AuthApi } from '@/lib/api/endpoints';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email) {
      Alert.alert('ইমেইল দিন', 'আপনার অ্যাকাউন্টের ইমেইল দিন।');
      return;
    }
    try {
      setLoading(true);
      await AuthApi.forgotPassword(email.trim());
    } catch {
      // Backend intentionally doesn't reveal whether the email exists.
    } finally {
      setLoading(false);
      Alert.alert('চেক করুন', 'যদি অ্যাকাউন্ট থাকে, রিসেট লিংক পাঠানো হয়েছে।', [
        { text: 'ঠিক আছে', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <AuthShell title="পাসওয়ার্ড রিসেট" subtitle="ইমেইলে রিসেট লিংক পাঠানো হবে">
      <View style={{ gap: 14 }}>
        <Field label="ইমেইল" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Button label="রিসেট লিংক পাঠান" onPress={submit} loading={loading} style={{ marginTop: 4 }} />
        <Button label="ফিরে যান" variant="ghost" onPress={() => router.back()} />
      </View>
    </AuthShell>
  );
}
