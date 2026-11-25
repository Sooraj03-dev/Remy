// mobile/app/(auth)/login.tsx
// Login screen with Clerk authentication and automatic database synchronization

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
import { useSignIn, useAuth } from '@clerk/clerk-expo';
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
import { Colors, Radius, Spacing, FontSize, FontFamily, Typography } from '@constants/theme';
import { Copy } from '@constants/copy';
import { syncUserWithBackend } from '../../services/api';

type FactorKind = 'first' | 'second';

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { getToken } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [factorKind, setFactorKind] = useState<FactorKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorAttempt, setErrorAttempt] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const shakeStyle = useShakeAnimation(errorAttempt);

  const pendingVerification = factorKind !== null;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const reportError = (message: string) => {
    setError(message);
    setErrorAttempt((c) => c + 1);
  };

  const readError = (err: unknown, fallback: string) =>
    err instanceof Error
      ? err.message
      : (err as { errors?: { message: string }[] })?.errors?.[0]?.message || fallback;

  /** A completed sign-in: activate the session, mirror the user to Neon, open the app. */
  const finishSignIn = async (sessionId: string | null, fullName?: string) => {
    await setActive?.({ session: sessionId });

    try {
      const token = await getToken();
      if (token) {
        await syncUserWithBackend(token, {
          fullName: fullName || 'Campus Student',
          email: email.trim(),
        });
      }
    } catch (syncErr) {
      console.warn('[Sync warning]', syncErr);
    }

    router.replace('/(tabs)/home');
  };

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    if (!email.trim() || !password) {
      reportError('Please enter both your university email and password.');
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
        const name = `${result.userData?.firstName || ''} ${
          result.userData?.lastName || ''
        }`.trim();
        await finishSignIn(result.createdSessionId, name);
        return;
      }

      // The account still needs an email code. Clerk asks for it as a second
      // factor when the address is unverified, or as a first factor when the
      // password step is deferred.
      if (result.status === 'needs_second_factor') {
        await signIn.prepareSecondFactor({ strategy: 'email_code' });
        setFactorKind('second');
        setResendCooldown(30);
        return;
      }

      if (result.status === 'needs_first_factor') {
        const emailCode = (signIn.supportedFirstFactors ?? []).find(
          (factor) => factor.strategy === 'email_code',
        ) as { emailAddressId: string } | undefined;

        if (!emailCode) {
          reportError('This account requires a sign-in method that is not supported here.');
          return;
        }

        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailCode.emailAddressId,
        });
        setFactorKind('first');
        setResendCooldown(30);
        return;
      }

      reportError(`Sign in could not be completed (status: ${result.status}).`);
    } catch (err: unknown) {
      reportError(readError(err, 'Sign in failed. Please verify your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn || !factorKind) return;
    if (!verificationCode.trim()) {
      reportError('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = { strategy: 'email_code' as const, code: verificationCode.trim() };
      const result =
        factorKind === 'second'
          ? await signIn.attemptSecondFactor(params)
          : await signIn.attemptFirstFactor(params);

      if (result.status === 'complete') {
        setOtpSuccess(true);
        const name = `${result.userData?.firstName || ''} ${
          result.userData?.lastName || ''
        }`.trim();
        await new Promise((r) => setTimeout(r, 420));
        await finishSignIn(result.createdSessionId, name);
      } else {
        reportError(`Verification could not be completed (status: ${result.status}).`);
      }
    } catch (err: unknown) {
      reportError(readError(err, 'Invalid verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signIn || !factorKind || resendCooldown > 0) return;
    setError('');
    try {
      if (factorKind === 'second') {
        await signIn.prepareSecondFactor({ strategy: 'email_code' });
      } else {
        const emailCode = (signIn.supportedFirstFactors ?? []).find(
          (factor) => factor.strategy === 'email_code',
        ) as { emailAddressId: string } | undefined;
        if (emailCode) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailCode.emailAddressId,
          });
        }
      }
      setResendCooldown(30);
    } catch (err: unknown) {
      reportError(readError(err, 'Could not resend code.'));
    }
  };

  const cancelVerification = () => {
    setFactorKind(null);
    setVerificationCode('');
    setError('');
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
        {/* Mascot / branding */}
        <View style={styles.branding}>
          <View style={styles.brandRow}>
            <RemyLogo size={pendingVerification ? 'md' : 'lg'} stacked idleMotion paused={isTyping || loading} />
          </View>
          <Text style={[Typography.caption, styles.tagline]}>{Copy.app.tagline}</Text>
        </View>

        {/* Login card */}
        <StaggeredItem index={0}>
          <Animated.View style={shakeStyle}>
            <ClayCard style={styles.card}>
              {pendingVerification ? (
                otpSuccess ? (
                  <View style={styles.otpSuccessBox}>
                    <AnimatedCheckDraw visible size={56} />
                    <ClayText variant="h3" align="center">Verified!</ClayText>
                    <ClayText variant="caption" color="textSecondary" align="center">
                      Signing you in to Remy...
                    </ClayText>
                  </View>
                ) : (
                  <>
                    <Text style={[Typography.h2, styles.cardTitle]}>Verify it&apos;s you</Text>
                    <Text style={[Typography.caption, styles.cardSubtitle]}>
                      {`Enter the 6-digit code sent to ${email.trim()}`}
                    </Text>

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
                      label="Back to sign in"
                      variant="ghost"
                      onPress={cancelVerification}
                      style={styles.backBtn}
                    />
                  </>
                )
              ) : (
                <>
                  <Text style={[Typography.h2, styles.cardTitle]}>Welcome back</Text>
                  <Text style={[Typography.caption, styles.cardSubtitle]}>
                    Sign in with your university account
                  </Text>

                  <StaggeredItem index={1}>
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

                  <StaggeredItem index={2}>
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
                      autoComplete="current-password"
                      error={error}
                      containerStyle={styles.field}
                    />
                  </StaggeredItem>

                  <StaggeredItem index={3}>
                    <ClayButton
                      label="Sign In"
                      onPress={handleSignIn}
                      loading={loading}
                      style={styles.button}
                    />
                  </StaggeredItem>

                  <View style={styles.footer}>
                    <Text style={Typography.caption}>Don't have an account? </Text>
                    <Link href="/(auth)/signup">
                      <Text style={styles.link}>Sign Up</Text>
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
  branding: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  brandRow: { alignItems: 'center', justifyContent: 'center' },
  tagline: {
    width: '100%',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  card: {
    gap: Spacing.sm,
    borderRadius: Radius.card,
  },
  otpSuccessBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
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
  backBtn: {
    marginTop: Spacing.xs,
  },
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
