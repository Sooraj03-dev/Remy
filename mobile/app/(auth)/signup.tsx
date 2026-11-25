// mobile/app/(auth)/signup.tsx
// Signup screen with email verification code flow and database synchronization

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Link, useRouter } from 'expo-router';
import { useSignUp, useAuth } from '@clerk/clerk-expo';
import {
  AnimatedCheckDraw,
  ClayCard,
  ClayInput,
  ClayButton,
  ClayText,
  StaggeredItem,
  useShakeAnimation,
} from '@components/index';
import { RemyLogo } from '@components/ui/RemyLogo';
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
  const [errorAttempt, setErrorAttempt] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const shakeStyle = useShakeAnimation(errorAttempt);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const reportError = (message: string) => {
    setError(message);
    setErrorAttempt((c) => c + 1);
  };

  // Step 1: Create user with email and password, then send verification code
  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;

    if (!fullName.trim() || !email.trim() || !password) {
      reportError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      reportError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      reportError('Password must be at least 8 characters long.');
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
      setResendCooldown(30);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
            'Sign up failed. Please try again.';
      reportError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code, activate session, and synchronize user with Neon database
  const handleVerifyCode = async () => {
    if (!isLoaded || !signUp) return;

    if (!verificationCode.trim()) {
      reportError('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        setOtpSuccess(true);
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

        await new Promise((r) => setTimeout(r, 420));
        router.replace('/(tabs)/home');
      } else {
        reportError('Verification could not be completed.');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
            'Invalid verification code.';
      reportError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp || resendCooldown > 0) return;
    setError('');
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResendCooldown(30);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
            'Could not resend verification code.';
      reportError(msg);
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
          <View style={styles.brandRow}>
            <RemyLogo size={pendingVerification ? 'md' : 'lg'} stacked idleMotion paused={isTyping || loading} />
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

        <StaggeredItem index={0}>
          <Animated.View style={shakeStyle}>
            <ClayCard style={styles.card}>
              {pendingVerification ? (
                otpSuccess ? (
                  <View style={styles.otpSuccessBox}>
                    <AnimatedCheckDraw visible size={56} />
                    <ClayText variant="h3" align="center">Email verified!</ClayText>
                    <ClayText variant="caption" color="textSecondary" align="center">
                      Setting up your campus account...
                    </ClayText>
                  </View>
                ) : (
                  // Verification step
                  <>
                    <StaggeredItem index={1}>
                      <ClayInput
                        showMascotOnFocus
                        label="Verification Code"
                        value={verificationCode}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                        onChangeText={(text) => {
                          setVerificationCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                          if (error) setError('');
                        }}
                        placeholder="123456"
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                        error={error}
                        containerStyle={styles.field}
                      />
                    </StaggeredItem>

                    <StaggeredItem index={2}>
                      <ClayButton
                        label="Verify & Sign In"
                        onPress={handleVerifyCode}
                        loading={loading}
                        style={styles.button}
                      />
                    </StaggeredItem>

                    <ClayButton
                      label={resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                      variant="secondary"
                      disabled={resendCooldown > 0}
                      onPress={handleResendCode}
                      style={styles.backBtn}
                    />

                    <ClayButton
                      label="Change Email / Back"
                      variant="ghost"
                      onPress={() => setPendingVerification(false)}
                      style={styles.backBtn}
                    />
                  </>
                )
              ) : (
                // Initial signup step
                <>
                  <StaggeredItem index={1}>
                    <ClayInput
                      label="Full Name"
                      value={fullName}
                      onFocus={() => setIsTyping(true)}
                      onBlur={() => setIsTyping(false)}
                      onChangeText={(text) => {
                        setFullName(text);
                        if (error) setError('');
                      }}
                      placeholder="Alex Johnson"
                      autoComplete="name"
                      containerStyle={styles.field}
                    />
                  </StaggeredItem>

                  <StaggeredItem index={2}>
                    <ClayInput
                      label="University Email"
                      value={email}
                      onFocus={() => setIsTyping(true)}
                      onBlur={() => setIsTyping(false)}
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
                  </StaggeredItem>

                  <StaggeredItem index={3}>
                    <ClayInput
                      label="Password"
                      value={password}
                      onFocus={() => setIsTyping(true)}
                      onBlur={() => setIsTyping(false)}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (error) setError('');
                      }}
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="new-password"
                      containerStyle={styles.field}
                    />
                  </StaggeredItem>

                  <StaggeredItem index={4}>
                    <ClayInput
                      label="Confirm Password"
                      value={confirmPassword}
                      onFocus={() => setIsTyping(true)}
                      onBlur={() => setIsTyping(false)}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (error) setError('');
                      }}
                      placeholder="••••••••"
                      secureTextEntry
                      error={error}
                      containerStyle={styles.field}
                    />
                  </StaggeredItem>

                  <StaggeredItem index={5}>
                    <ClayButton
                      label="Create Account"
                      onPress={handleSignUp}
                      loading={loading}
                      style={styles.button}
                    />
                  </StaggeredItem>

                  <View style={styles.footer}>
                    <Text style={Typography.caption}>Already have an account? </Text>
                    <Link href="/(auth)/login">
                      <Text style={styles.link}>Sign In</Text>
                    </Link>
                  </View>
                </>
              )}
            </ClayCard>
          </Animated.View>
        </StaggeredItem>
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
  brandRow: { alignItems: 'center', justifyContent: 'center' },
  tagline: { textAlign: 'center', marginTop: Spacing.xs },
  card: { gap: Spacing.sm },
  otpSuccessBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
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
