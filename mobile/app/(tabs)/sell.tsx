// mobile/app/(tabs)/sell.tsx
// Sell screen — Create product listing with real image picker, Cloudinary upload, and validation

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RemyMascot } from '@components/ui/RemyMascot';
import { RemyFormError, useRemyFormFeedback } from '@components/ui/RemyFormError';
import { useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import {
  AppIcon,
  ClayHeader,
  ClayCard,
  ClayInput,
  ClayButton,
  CelebrationOverlay,
  ExpandReveal,
  ShimmerSweep,
  useShakeAnimation,
  useToast,
} from '@components/index';
import type { IconName } from '@constants/icons';
import { Durations } from '@constants/motion';
import { Colors, Spacing, Radius, Typography, FontSize, FontFamily } from '@constants/theme';
import { Copy } from '@constants/copy';
import {
  createProduct,
  uploadProductImages,
  getAISuggestions,
  evaluateListingQuality,
} from '../../services/api';
import type { ProductCategory, ProductCondition } from '../../../shared/types';

const CATEGORIES: { label: string; value: ProductCategory; icon: IconName }[] = [
  { label: 'Books', value: 'books', icon: 'textbooks' },
  { label: 'Electronics', value: 'electronics', icon: 'electronics' },
  { label: 'Clothing', value: 'clothing', icon: 'clothing' },
  { label: 'Stationery', value: 'stationery', icon: 'stationery' },
  { label: 'Sports', value: 'sports', icon: 'basketball' },
  { label: 'Furniture', value: 'furniture', icon: 'furniture' },
  { label: 'Food', value: 'food', icon: 'food' },
  { label: 'Other', value: 'other', icon: 'package' },
];

const CONDITIONS: { label: string; value: ProductCondition; icon: IconName }[] = [
  { label: 'Brand New', value: 'new', icon: 'aiAssist' },
  { label: 'Like New', value: 'like_new', icon: 'thumbsUp' },
  { label: 'Good', value: 'good', icon: 'checkCircle' },
  { label: 'Fair', value: 'fair', icon: 'package' },
];

export default function SellScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { getToken } = useAuth();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ProductCategory>('books');
  const [condition, setCondition] = useState<ProductCondition>('good');
  const [description, setDescription] = useState('');
  const [campusLocation, setCampusLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // AI Assistant states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQualityScore, setAiQualityScore] = useState<number | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string[]>([]);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const { showToast } = useToast();

  // Pick images from the device gallery
  const handlePickImages = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow access to your photos to upload product pictures.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((asset) => asset.uri);
        setImages((prev) => [...prev, ...newUris].slice(0, 5));
      }
    } catch {
      Alert.alert('Error', 'Could not open image library.');
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAIAssist = async () => {
    setAiLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to use the AI Listing Assistant.');

      const [suggestRes, evalRes] = await Promise.all([
        getAISuggestions(token, {
          draftTitle: title,
          draftDescription: description,
          category,
          price: parseFloat(price) || undefined,
        }),
        evaluateListingQuality(token, {
          draftTitle: title,
          draftDescription: description,
          category,
          price: parseFloat(price) || undefined,
        }),
      ]);

      if (suggestRes.title && !title) {
        setTitle(suggestRes.title);
      }
      if (suggestRes.description && (!description || description.length < 20)) {
        setDescription(suggestRes.description);
      }
      if (suggestRes.suggestedCategory) {
        setCategory(suggestRes.suggestedCategory);
      }

      setAiQualityScore(evalRes.qualityScore);
      setAiFeedback(evalRes.feedback || []);
      setAiTips([...(evalRes.improvements || []), ...(suggestRes.tips || [])]);

      Alert.alert(
        'AI Assistant Suggestions',
        `Listing Quality Score: ${evalRes.qualityScore}/100.\n\nSuggestions applied for title, description, and category. Review and edit as needed!`,
      );
    } catch (err) {
      Alert.alert(
        'AI Assistant',
        err instanceof Error ? err.message : 'Could not fetch AI suggestions.',
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim() || title.trim().length < 3) {
      setError('Title must be at least 3 characters long.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please enter a valid positive price.');
      return;
    }

    setSubmitting(true);
    setStatusMessage('Preparing listing...');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Please sign in to list items for sale.');
      }

      let uploadedImageUrls: string[] = [];

      // If user selected local images, upload them to Cloudinary via backend
      if (images.length > 0) {
        setStatusMessage(`Uploading ${images.length} image(s)...`);
        try {
          uploadedImageUrls = await uploadProductImages(token, images);
        } catch (uploadErr) {
          console.warn('[Image upload warning]', uploadErr);
          // If Cloudinary is unconfigured in local dev, allow listing without crashing
          uploadedImageUrls = [];
        }
      }

      setStatusMessage('Creating marketplace listing...');
      await createProduct(token, {
        title: title.trim(),
        price: numPrice,
        category,
        condition,
        description: description.trim() || undefined,
        campusLocation: campusLocation.trim() || undefined,
        images: uploadedImageUrls,
      });

      setTitle('');
      setPrice('');
      setDescription('');
      setCampusLocation('');
      setImages([]);
      setAiQualityScore(null);
      setAiFeedback([]);
      setAiTips([]);
      setShowCelebration(true);
      showToast(Copy.success.submitted, 'success');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create listing.';
      setError(msg);
    } finally {
      setSubmitting(false);
      setStatusMessage('');
    }
  };

  const feedback = useRemyFormFeedback(error, handleSubmit);
  const errorShake = useShakeAnimation(feedback.attempt + (error ? 1 : 0));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <ClayHeader title="Sell on Campus" subtitle="List a second-hand item" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxxl + insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Item details */}
          <ClayCard>
            <Text style={[Typography.h3, styles.sectionTitle]}>Item Details</Text>

            <ClayInput
              showMascotOnFocus
              label="Listing Title *"
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (error) setError(null);
              }}
              placeholder="e.g. Calculus: Early Transcendentals 8th Ed"
              containerStyle={styles.field}
            />

            <ClayInput
              showMascotOnFocus
              label="Price (₹) *"
              value={price}
              onChangeText={(p) => {
                setPrice(p);
                if (error) setError(null);
              }}
              placeholder="450"
              keyboardType="numeric"
              containerStyle={styles.field}
            />

            {/* Category selection */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.sm }]}>
              Category *
            </Text>
            <View style={styles.chipTrack}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <Pressable
                      key={cat.value}
                      onPress={() => setCategory(cat.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => [
                        styles.pill,
                        isSelected && styles.pillSelected,
                        pressed && styles.pillPressed,
                      ]}
                    >
                      <AppIcon
                        name={cat.icon}
                        size={16}
                        tint={isSelected ? 'white' : 'textSecondary'}
                      />
                      <Text
                        style={[
                          Typography.captionBold,
                          { color: isSelected ? Colors.white : Colors.text },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <LinearGradient
                colors={['rgba(250,246,241,0)', 'rgba(250,246,241,0.92)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chipFadeRight}
                pointerEvents="none"
              />
            </View>

            {/* Condition selection */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.sm }]}>
              Condition *
            </Text>
            <View style={styles.chipTrack}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {CONDITIONS.map((cond) => {
                  const isSelected = condition === cond.value;
                  return (
                    <Pressable
                      key={cond.value}
                      onPress={() => setCondition(cond.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => [
                        styles.pill,
                        isSelected && styles.pillSelected,
                        pressed && styles.pillPressed,
                      ]}
                    >
                      <AppIcon
                        name={cond.icon}
                        size={16}
                        tint={isSelected ? 'white' : 'textSecondary'}
                      />
                      <Text
                        style={[
                          Typography.captionBold,
                          { color: isSelected ? Colors.white : Colors.text },
                        ]}
                      >
                        {cond.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <LinearGradient
                colors={['rgba(250,246,241,0)', 'rgba(250,246,241,0.92)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chipFadeRight}
                pointerEvents="none"
              />
            </View>

            <ClayInput
              showMascotOnFocus
              label="Preferred Meetup Location"
              value={campusLocation}
              onChangeText={setCampusLocation}
              placeholder="e.g. Central Library foyer, Student Center"
              containerStyle={styles.field}
            />

            <ClayInput
              showMascotOnFocus
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Provide edition, working condition, or any included accessories..."
              multiline
              numberOfLines={4}
              containerStyle={styles.field}
              style={styles.multiline}
            />

            {/* AI Assistant Action */}
            <View style={styles.aiButtonWrap}>
              <ClayButton
                label={aiLoading ? 'Generating AI Suggestions...' : 'AI Assist & Quality Check'}
                leftIcon="aiAssist"
                variant="secondary"
                onPress={handleAIAssist}
                loading={aiLoading}
                style={{ marginTop: Spacing.sm }}
              />
              {aiLoading && !reduced ? <ShimmerSweep width={280} /> : null}
            </View>

            <ExpandReveal visible={aiQualityScore !== null}>
              {aiQualityScore !== null ? (
                <ClayCard variant="mint" style={{ marginTop: Spacing.sm, padding: Spacing.sm, gap: 4 }}>
                  <View style={styles.inlineHeader}>
                    <AppIcon name="score" size={18} tint="successText" />
                    <Text style={Typography.bodyBold}>Listing Score: {aiQualityScore}/100</Text>
                  </View>
                  {aiFeedback.map((fb, idx) => (
                    <View key={`fb-${idx}`} style={styles.inlineRow}>
                      <AppIcon name="check" size={14} tint="successText" />
                      <Text style={[Typography.caption, { color: Colors.successText, flex: 1 }]}>
                        {fb}
                      </Text>
                    </View>
                  ))}
                  {aiTips.map((tip, idx) => (
                    <View key={`tip-${idx}`} style={styles.inlineRow}>
                      <AppIcon name="tip" size={14} tint="textSecondary" />
                      <Text style={[Typography.caption, { color: Colors.textSecondary, flex: 1 }]}>
                        {tip}
                      </Text>
                    </View>
                  ))}
                </ClayCard>
              ) : null}
            </ExpandReveal>
          </ClayCard>

          {/* Image Picker Card */}
          <ClayCard>
            <View style={styles.imageHeader}>
              <Text style={Typography.h3}>Photos ({images.length}/5)</Text>
              {images.length < 5 && (
                <ClayButton
                  label="Add Photo"
                  leftIcon="sell"
                  variant="secondary"
                  onPress={handlePickImages}
                  style={styles.addPhotoBtn}
                />
              )}
            </View>

            {images.length === 0 ? (
              <Pressable onPress={handlePickImages} style={styles.uploadPrompt}>
                <AppIcon name="camera" size="lg" variant="duotone" tint="primary" />
                <Text style={Typography.bodyBold}>Upload Item Photos</Text>
                <Text style={Typography.caption}>
                  Add up to 5 clear photos of your product.
                </Text>
              </Pressable>
            ) : (
              <View style={styles.thumbnailGrid}>
                {images.map((uri, idx) => (
                  <Animated.View
                    key={uri}
                    entering={reduced ? undefined : ZoomIn.duration(Durations.micro)}
                    style={styles.thumbnailWrapper}
                  >
                    <Image source={{ uri }} style={styles.thumbnail} />
                    <Pressable
                      onPress={() => handleRemoveImage(idx)}
                      style={styles.deletePhotoBtn}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${idx + 1}`}
                    >
                      <AppIcon name="close" size={12} tint="surface" />
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            )}
          </ClayCard>

          {/* Verification Notice */}
          <ClayCard variant="lavender" style={styles.noticeCard}>
            <View style={styles.inlineHeader}>
              <AppIcon name="safeZone" size={18} tint="primary" />
              <Text style={Typography.bodyBold}>Verification Guarantee</Text>
            </View>
            <Text style={[Typography.caption, { marginTop: 4 }]}>
              All campus listings are reviewed by verified student moderators to
              prevent spam, counterfeits, and prohibited items.
            </Text>
          </ClayCard>

          {statusMessage ? (
            <RemyMascot state="loading" nibble size={50} status={statusMessage} />
          ) : null}

          <Animated.View style={errorShake}>
            <RemyFormError message={feedback.message} attempt={feedback.attempt} />
          </Animated.View>
          <ClayButton
            label={submitting ? Copy.sell.submitting : feedback.message ? Copy.error.retry : Copy.sell.submit}
            onPress={feedback.onSubmit}
            loading={submitting}
            style={styles.submitBtn}
          />
        </ScrollView>

        <CelebrationOverlay
          visible={showCelebration}
          pendingApproval
          title={Copy.success.submitted}
          message="Your listing will appear on the campus feed once it’s approved."
          onDismiss={() => {
            setShowCelebration(false);
            router.push('/seller/dashboard');
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  sectionTitle: { marginBottom: Spacing.xs },
  field: { marginVertical: Spacing.xs },
  fieldLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.label,
    color: Colors.text,
    marginBottom: 4,
  },
  chipTrack: {
    marginHorizontal: -Spacing.base,
    marginVertical: 4,
    position: 'relative',
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingRight: Spacing.xxl,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.input,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  chipFadeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 28,
  },
  inlineHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  aiButtonWrap: { overflow: 'hidden', borderRadius: Radius.card },
  multiline: { height: 90, textAlignVertical: 'top' },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addPhotoBtn: { minHeight: 40, paddingVertical: 6, paddingHorizontal: 14 },
  uploadPrompt: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 4,
  },
  thumbnailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumbnailWrapper: { position: 'relative' },
  thumbnail: { width: 72, height: 72, borderRadius: Radius.sm },
  deletePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.error,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCard: { padding: Spacing.base },
  submitBtn: { marginTop: Spacing.xs },
});
