// shared/types/ai.ts
// Shared AI Assistant types for smart listing suggestions

import type { ProductCategory } from './product';

export interface AISuggestionResponse {
  title?: string;
  description?: string;
  suggestedCategory?: ProductCategory;
  qualityScore?: number; // 0-100
  feedback?: string[];
  tips?: string[];
}

export interface AISuggestionRequest {
  draftTitle?: string;
  draftDescription?: string;
  category?: string;
  price?: number;
}

