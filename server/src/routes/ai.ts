// server/src/routes/ai.ts
// AI-assisted listing assistant routes (Title, description, category suggestions & listing quality feedback)

import { Router } from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth';
import type { ProductCategory } from '../../../shared/types';

export const aiRouter = Router();

aiRouter.use(protect);

const suggestionSchema = z.object({
  draftTitle: z.string().optional(),
  draftDescription: z.string().optional(),
  category: z.string().optional(),
  price: z.number().optional(),
});

function inferCategoryFromText(text: string): ProductCategory {
  const lower = text.toLowerCase();
  if (lower.match(/\b(book|textbook|author|edition|page|novel|syllabus|guide|notes)\b/)) {
    return 'books';
  }
  if (lower.match(/\b(phone|laptop|macbook|charger|cable|earbuds|headphones|monitor|tablet|ipad|camera|mouse|keyboard)\b/)) {
    return 'electronics';
  }
  if (lower.match(/\b(shirt|hoodie|jacket|shoes|sneakers|pants|dress|bag|backpack|coat)\b/)) {
    return 'clothing';
  }
  if (lower.match(/\b(pen|pencil|calculator|notebook|folder|highlighter|eraser|stapler)\b/)) {
    return 'stationery';
  }
  if (lower.match(/\b(bat|ball|racket|badminton|football|cricket|gym|dumbbell|yoga|cycle|bicycle)\b/)) {
    return 'sports';
  }
  if (lower.match(/\b(chair|desk|table|lamp|cushion|bed|mattress|shelf|drawer)\b/)) {
    return 'furniture';
  }
  if (lower.match(/\b(snack|noodles|coffee|tea|cooker|kettle|utensil|plate)\b/)) {
    return 'food';
  }
  return 'other';
}

/**
 * POST /api/ai/suggest
 * Provides AI/smart suggestions for title, description, and category based on draft inputs.
 */
aiRouter.post('/suggest', async (req, res, next) => {
  try {
    const { draftTitle, draftDescription, price } = suggestionSchema.parse(req.body);

    const inputContext = `${draftTitle || ''} ${draftDescription || ''}`.trim();
    const suggestedCategory = inferCategoryFromText(inputContext);

    // Enhanced suggestions based on input context
    let suggestedTitle = draftTitle;
    let suggestedDescription = draftDescription;
    const tips: string[] = [];

    if (draftTitle && draftTitle.length > 0) {
      // Clean and capitalize keywords
      const titleWords = draftTitle.trim().split(/\s+/);
      const cleanTitle = titleWords
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      suggestedTitle = cleanTitle;
    } else {
      suggestedTitle = 'Calculus Early Transcendentals (8th Edition)';
    }

    if (!draftDescription || draftDescription.length < 20) {
      suggestedDescription = `${suggestedTitle}. In good condition, with minimal highlights and intact binding. Ideal for campus coursework and exam preparation. Available for campus meetup.`;
      tips.push('Expanded description to include item condition and course usefulness.');
    } else {
      tips.push('Description is well-detailed for campus buyers.');
    }

    if (!price || price <= 0) {
      tips.push('Set a competitive price to sell faster (typically 40–60% of retail price on campus).');
    }

    tips.push('Choose a verified, well-lit campus meetup location (such as the Main Library or Student Center).');

    res.status(200).json({
      success: true,
      data: {
        title: suggestedTitle,
        description: suggestedDescription,
        suggestedCategory,
        tips,
        source: 'campus_smart_assistant',
      },
      message: 'AI listing recommendations generated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/evaluate-listing
 * Computes an objective listing quality score and actionable feedback for the seller.
 */
aiRouter.post('/evaluate-listing', async (req, res, next) => {
  try {
    const { draftTitle, draftDescription, category, price } = suggestionSchema.parse(req.body);

    let score = 30; // base score
    const feedback: string[] = [];
    const improvements: string[] = [];

    // Title evaluation
    if (draftTitle && draftTitle.trim().length >= 8) {
      score += 20;
      feedback.push('Clear, descriptive product title.');
    } else {
      improvements.push('Make title more specific (include brand, model, or edition).');
    }

    // Description evaluation
    if (draftDescription && draftDescription.trim().length >= 30) {
      score += 25;
      feedback.push('Detailed description provided.');
    } else {
      improvements.push('Add more description details (condition, accessories included, reason for selling).');
    }

    // Category evaluation
    if (category && category !== 'other') {
      score += 15;
      feedback.push(`Categorized appropriately under ${category}.`);
    } else {
      improvements.push('Select a specific category rather than "Other" to increase discoverability.');
    }

    // Price evaluation
    if (price && price > 0) {
      score += 10;
      feedback.push('Price is specified.');
    } else {
      improvements.push('Specify a fair asking price.');
    }

    score = Math.min(100, score);

    res.status(200).json({
      success: true,
      data: {
        qualityScore: score,
        feedback,
        improvements,
        isQualityPass: score >= 70,
      },
      message: 'Listing evaluated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

