// mobile/app/(auth)/signup.tsx
// Signup screen with email verification code flow and database synchronization

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
import { useSignUp, useAuth } from '@clerk/clerk-expo';
import { ClayCard, ClayInput, ClayButton } from '@components/index';
import { RemyLogo } from '@components/ui/RemyLogo';
import { RemyMascot } from '@components/ui/RemyMascot';
import { Colors, Spacing, FontSize, FontFamily, Typography } from '@constants/theme';
import { Copy } from '@constants/copy';
import { syncUserWithBackend } from '../../services/api';

export default function SignupScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { getToken } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Create user with email and password, then send verification code
  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;

    if (!fullName.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || undefined;

      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName,
      });

      // Send verification code to email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
            'Sign up failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code, activate session, and synchronize user with Neon database
  const handleVerifyCode = async () => {
    if (!isLoaded || !signUp) return;

    if (!verificationCode.trim()) {
      setError('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });

        // Synchronize authenticated user into Neon database
        try {
          const token = await getToken();
          if (token) {
            await syncUserWithBackend(token, {
              fullName: fullName.trim(),
              email: email.trim(),
            });
          }
        } catch (syncErr) {
          console.warn('[Sync warning]', syncErr);
        }

        router.replace('/(tabs)/home');
      } else {
        setError('Verification could not be completed.');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
            'Invalid verification code.';
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.branding}>
          <View style={[styles.brandRow, { minHeight: pendingVerification ? 140 : 150 }]}>
            <RemyLogo size={pendingVerification ? 'md' : 'lg'} stacked />
            {pendingVerification ? <RemyMascot state="loading" size={50} busy={loading} /> : null}
          </View>
          <Text style={Typography.h2}>
            {pendingVerification ? 'Verify Email' : Copy.auth.signupTitle}
          </Text>
          <Text style={[Typography.caption, styles.tagline]}>
            {pendingVerification
              ? `Enter the 6-digit code sent to ${email}`
              : Copy.auth.signupTagline}
          </Text>
        </View>

        <ClayCard style={styles.card}>
          {pendingVerification ? (
            // Verification step
            <>
              <ClayInput
                showMascotOnFocus
                label="Verification Code"
                value={verificationCode}
                onChangeText={(text) => {
                  setVerificationCode(text);
                  if (error) setError('');
                }}
                placeholder="123456"
                keyboardType="number-pad"
                autoFocus
                error={error}
                containerStyle={styles.field}
              />

              <ClayButton
                label="Verify & Sign In"
                onPress={handleVerifyCode}
                loading={loading}
                style={styles.button}
              />

              <ClayButton
                label="Change Email / Back"
                variant="ghost"
                onPress={() => setPendingVerification(false)}
                style={styles.backBtn}
              />
            </>
          ) : (
            // Initial signup step
            <>
              <ClayInput
                label="Full Name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (error) setError('');
                }}
                placeholder="Alex Johnson"
                autoComplete="name"
                containerStyle={styles.field}
              />

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
                autoComplete="new-password"
                containerStyle={styles.field}
              />

              <ClayInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                secureTextEntry
                error={error}
                containerStyle={styles.field}
              />

              <ClayButton
                label="Create Account"
                onPress={handleSignUp}
                loading={loading}
                style={styles.button}
              />

              <View style={styles.footer}>
                <Text style={Typography.caption}>Already have an account? </Text>
                <Link href="/(auth)/login">
                  <Text style={styles.link}>Sign In</Text>
                </Link>
              </View>
            </>
          )}
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
  branding: { alignItems: 'center', gap: Spacing.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  emoji: { fontSize: 48, marginBottom: Spacing.sm },
  tagline: { textAlign: 'center', marginTop: Spacing.xs },
  card: { gap: Spacing.sm },
  field: { marginVertical: Spacing.xs },
  button: { marginTop: Spacing.sm },
  backBtn: { marginTop: Spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  link: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.label,
    color: Colors.primary,
  },
});
