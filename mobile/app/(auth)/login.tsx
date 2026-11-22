// mobile/app/(auth)/login.tsx
// Login screen with Clerk authentication and automatic database synchronization

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignIn, useAuth } from '@clerk/clerk-expo';
import { ClayCard, ClayInput, ClayButton, FloatingBlobs } from '@components/index';
import { RemyLogo } from '@components/ui/RemyLogo';
import { Colors, Spacing, FontSize, FontWeight, Typography } from '@constants/theme';
import { Copy } from '@constants/copy';
import { syncUserWithBackend } from '../../services/api';

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { getToken } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    if (!email.trim() || !password) {
      setError('Please enter both your university email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });

        // Synchronize user to Neon PostgreSQL database
        try {
          const token = await getToken();
          if (token) {
            await syncUserWithBackend(token, {
              fullName: `${result.userData?.firstName || ''} ${
                result.userData?.lastName || ''
              }`.trim() || 'Campus Student',
              email: email.trim(),
            });
          }
        } catch (syncErr) {
          console.warn('[Sync warning]', syncErr);
        }

        router.replace('/(tabs)/home');
      } else {
        setError('Additional authentication factors required.');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
            'Sign in failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FloatingBlobs variant="auth" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mascot / branding */}
        <View style={styles.branding}>
          <View style={styles.brandRow}>
            <RemyLogo size="lg" stacked />
          </View>
          <Text style={[Typography.caption, styles.tagline]}>{Copy.app.tagline}</Text>
        </View>

        {/* Login card */}
        <ClayCard style={styles.card}>
          <Text style={[Typography.h2, styles.cardTitle]}>Welcome back</Text>
          <Text style={[Typography.caption, styles.cardSubtitle]}>
            Sign in with your university account
          </Text>

          <ClayInput
            label="University Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError('');
            }}
            placeholder="student@university.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            containerStyle={styles.field}
          />

          <ClayInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError('');
            }}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
            error={error}
            containerStyle={styles.field}
          />

          <ClayButton
            label="Sign In"
            onPress={handleSignIn}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={Typography.caption}>Don't have an account? </Text>
            <Link href="/(auth)/signup">
              <Text style={styles.link}>Sign Up</Text>
            </Link>
          </View>
        </ClayCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xxxl,
    gap: Spacing.xl,
  },
  branding: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  brandRow: { minHeight: 163, flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  tagline: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  card: {
    gap: Spacing.sm,
  },
  cardTitle: {
    marginBottom: 2,
  },
  cardSubtitle: {
    marginBottom: Spacing.sm,
  },
  field: {
    marginVertical: Spacing.xs,
  },
  button: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  link: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    color: Colors.primary,
  },
});
