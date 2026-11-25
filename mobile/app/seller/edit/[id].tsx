// mobile/app/seller/edit/[id].tsx
// Edit Product Screen — Allows sellers to edit their listings with claymorphism UI

import React, { useState, useEffect, useCallback } from 'react';
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
import { RemyMascot } from '@components/ui/RemyMascot';
import { RemyFormError, useRemyFormFeedback } from '@components/ui/RemyFormError';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { AppIcon, ClayHeader, ClayCard, ClayInput, ClayButton, StatusBadge } from '@components/index';
import type { IconName } from '@constants/icons';
import { Colors, Spacing, Radius, Typography, FontSize, FontFamily } from '@constants/theme';
import { fetchProductById, updateProduct, uploadProductImages } from '../../../services/api';
import type { Product, ProductCategory, ProductCondition } from '../../../../shared/types';

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

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ProductCategory>('books');
  const [condition, setCondition] = useState<ProductCondition>('good');
  const [description, setDescription] = useState('');
  const [campusLocation, setCampusLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required.');
      const data = await fetchProductById(id, token);
      setProduct(data);
      setTitle(data.title);
      setPrice(data.price.toString());
      setCategory(data.category);
      setCondition(data.condition);
      setDescription(data.description || '');
      setCampusLocation(data.campusLocation || '');
      setImages(data.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load listing for editing.');
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handlePickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Access to photos is required to add product images.');
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

  const handleSave = async () => {
    if (!id) return;
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

    setSaving(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated.');

      // Check if new local file URIs need uploading
      const localUris = images.filter((uri) => uri.startsWith('file://') || uri.startsWith('ph://'));
      const existingUrls = images.filter((uri) => !uri.startsWith('file://') && !uri.startsWith('ph://'));

      let finalImages = [...existingUrls];
      if (localUris.length > 0) {
        try {
          const uploadedUrls = await uploadProductImages(token, localUris);
          finalImages = [...finalImages, ...uploadedUrls];
        } catch (uploadErr) {
          console.warn('[Image upload warning]', uploadErr);
        }
      }

      await updateProduct(token, id, {
        title: title.trim(),
        price: numPrice,
        category,
        condition,
        description: description.trim() || undefined,
        campusLocation: campusLocation.trim() || undefined,
        images: finalImages,
      });

      Alert.alert(
        'Listing Updated',
        product?.status === 'rejected'
          ? 'Your listing has been updated and resubmitted for admin review.'
          : 'Your changes have been saved.',
        [{ text: 'OK', onPress: () => router.replace('/seller/dashboard') }],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update listing.');
    } finally {
      setSaving(false);
    }
  };

  const feedback = useRemyFormFeedback(error, handleSave);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <RemyMascot state="loading" status="Loading listing details..." />
      </View>
    );
  }

  if (error && !product) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <ClayCard variant="peach" style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <AppIcon name="warning" size={36} tint="errorText" />
          </View>
          <Text style={Typography.bodyBold}>Cannot Edit Listing</Text>
          <Text style={[Typography.caption, styles.errorText]}>{error}</Text>
          <ClayButton label="Go Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: Spacing.sm }} />
        </ClayCard>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: Spacing.xxxl + insets.bottom }]}>
        <ClayHeader title="Edit Listing" subtitle="Update your item details or price" />

        {/* Current status display */}
        {product && (
          <ClayCard variant="lavender" style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={Typography.bodyBold}>Current Status:</Text>
              <StatusBadge status={product.status} />
            </View>
            {product.status === 'rejected' && product.rejectionReason ? (
              <View style={styles.rejectedBanner}>
                <Text style={Typography.captionBold}>Rejection Note:</Text>
                <Text style={Typography.caption}>{product.rejectionReason}</Text>
                <View style={styles.inlineRow}>
                  <AppIcon name="tip" size={14} tint="primary" />
                  <Text style={[Typography.caption, { color: Colors.primary, flex: 1 }]}>
                    Updating and saving will resubmit this item for review.
                  </Text>
                </View>
              </View>
            ) : null}
          </ClayCard>
        )}

        {/* Form fields */}
        <ClayCard style={styles.card}>
          <Text style={[Typography.captionBold, styles.fieldLabel]}>Item Title *</Text>
          <ClayInput
            showMascotOnFocus
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Engineering Mathematics II"
            maxLength={120}
          />

          <Text style={[Typography.captionBold, styles.fieldLabel]}>Price (₹) *</Text>
          <ClayInput
            showMascotOnFocus
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 450"
            keyboardType="numeric"
          />

          {/* Category Chips */}
          <Text style={[Typography.captionBold, styles.fieldLabel]}>Category *</Text>
          <View style={styles.chipTrack}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <AppIcon name={cat.icon} size={15} tint={selected ? 'white' : 'textSecondary'} />
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
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

          {/* Condition Chips */}
          <Text style={[Typography.captionBold, styles.fieldLabel]}>Condition *</Text>
          <View style={styles.chipTrack}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {CONDITIONS.map((cond) => {
                const selected = condition === cond.value;
                return (
                  <Pressable
                    key={cond.value}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => setCondition(cond.value)}
                  >
                    <AppIcon name={cond.icon} size={15} tint={selected ? 'white' : 'textSecondary'} />
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
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

          <Text style={[Typography.captionBold, styles.fieldLabel]}>Campus Meetup Location</Text>
          <ClayInput
            showMascotOnFocus
            value={campusLocation}
            onChangeText={setCampusLocation}
            placeholder="e.g. Library 2nd Floor, Central Cafeteria"
          />

          <Text style={[Typography.captionBold, styles.fieldLabel]}>Description</Text>
          <ClayInput
            showMascotOnFocus
            value={description}
            onChangeText={setDescription}
            placeholder="Describe condition, edition, accessories..."
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />

          {/* Image Previews & Picker */}
          <Text style={[Typography.captionBold, styles.fieldLabel]}>
            Photos ({images.length}/5)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
            {images.map((imgUri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: imgUri }} style={styles.thumbnail} />
                <Pressable
                  style={styles.removeBadge}
                  onPress={() => handleRemoveImage(index)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <AppIcon name="close" size={11} tint="surface" />
                </Pressable>
              </View>
            ))}
            {images.length < 5 && (
              <Pressable style={styles.addPhotoSlot} onPress={handlePickImages}>
                <AppIcon name="camera" size={20} tint="primary" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </Pressable>
            )}
          </ScrollView>

          <RemyFormError message={feedback.message} attempt={feedback.attempt} />
          <View style={styles.actionRow}>
            <ClayButton
              label={saving ? 'Saving...' : feedback.message ? 'Try again' : 'Save Changes'}
              onPress={feedback.onSubmit}
              loading={saving}
              style={styles.saveBtn}
            />
            <ClayButton
              label="Cancel"
              variant="secondary"
              onPress={() => router.back()}
              style={styles.cancelBtn}
            />
          </View>
        </ClayCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
  centerBox: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorCard: { padding: Spacing.lg, alignItems: 'center', width: '100%' },
  errorIcon: { marginBottom: Spacing.sm },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.xs },
  errorText: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xs },
  statusCard: { marginBottom: Spacing.md, padding: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rejectedBanner: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  card: { padding: Spacing.md },
  fieldLabel: { color: Colors.text, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  chipTrack: { marginHorizontal: -Spacing.md, marginBottom: Spacing.xs, position: 'relative' },
  chipsRow: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingRight: Spacing.xxl, paddingVertical: 4 },
  chipFadeRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 24 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.input,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: FontSize.caption, fontFamily: FontFamily.label, color: Colors.text },
  chipTextActive: { color: Colors.white, fontFamily: FontFamily.bodyBold },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  imagesRow: { flexDirection: 'row', marginTop: Spacing.xs, marginBottom: Spacing.md },
  imageWrapper: { position: 'relative', marginRight: Spacing.sm },
  thumbnail: { width: 72, height: 72, borderRadius: Radius.md },
  removeBadge: {
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
  addPhotoSlot: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successBg,
  },
  addPhotoText: { fontSize: 10, fontFamily: FontFamily.bodyBold, color: Colors.text, marginTop: 2 },
  actionRow: { marginTop: Spacing.md, gap: Spacing.sm },
  saveBtn: { width: '100%' },
  cancelBtn: { width: '100%' },
});
