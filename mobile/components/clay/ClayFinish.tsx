import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ClayEdges, ClayGradients, Radius, type ClayTone } from '@constants/theme';

interface ClayFinishProps {
  tone?: ClayTone;
  radius?: number;
}

export function resolveClayRadius(radius: ViewStyle['borderRadius']) {
  return typeof radius === 'number' ? Math.min(Radius.lg, Math.max(22, radius)) : Radius.card;
}

/** Decorative face and bevel. The parent supplies the shape and casts its shadow. */
export function ClayFinish({ tone = 'oat', radius = Radius.card }: ClayFinishProps) {
  const shape = { borderRadius: radius };
  const edges = tone === 'espresso' || tone === 'terracotta' ? ClayEdges.dark : ClayEdges.light;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <LinearGradient
        colors={ClayGradients[tone]}
        locations={[0, 0.38, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, shape]}
      />
      <View style={[styles.bevel, shape, edges]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bevel: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 2,
    borderLeftWidth: 1.5,
    borderBottomWidth: 3,
    borderRightWidth: 1.5,
  },
});
