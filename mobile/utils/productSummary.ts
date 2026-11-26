// mobile/utils/productSummary.ts
// Smart local bot summary & interactive Q&A generator for Remy Scout Bot.

import type { Product, ProductCategory, ProductCondition } from '../../shared/types';

export type BotTopic = 'summary' | 'condition' | 'deal' | 'meetup';

export interface BotVerdict {
  label: string;
  tone: 'success' | 'accent' | 'default' | 'error';
}

export interface ProductBotBrief {
  headline: string;
  conditionLabel: string;
  categoryLabel: string;
  verdict: BotVerdict;
  shortSummary: string;
  replies: Record<Exclude<BotTopic, 'summary'>, string>;
}

const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

const CONDITION_DETAILS: Record<ProductCondition, string> = {
  new: 'Unused or sealed condition — practically straight out of the box.',
  like_new: 'Barely used with virtually zero visible wear.',
  good: 'Well looked after with normal light campus use.',
  fair: 'Budget-friendly with honest signs of previous use.',
};

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  books: 'Textbook',
  electronics: 'Electronics',
  clothing: 'Apparel',
  stationery: 'Stationery',
  sports: 'Sports Gear',
  furniture: 'Dorm Furniture',
  food: 'Food & Kitchen',
  other: 'Campus Item',
};

const CATEGORY_TIPS: Record<ProductCategory, string> = {
  books: 'Flip through for missing pages or heavy notes before trading.',
  electronics: 'Test power, charging port, and speakers in person at meetup.',
  clothing: 'Check sizing, zippers, and fabric condition in good light.',
  stationery: 'Verify ink levels, calculator keys, or full set count.',
  sports: 'Check grip, frame alignment, or tire pressure before paying.',
  furniture: 'Check joints and dimensions to make sure it fits your hostel room.',
  food: 'Check seal and expiry date before completing the handover.',
  other: 'Inspect the item carefully in a well-lit public campus spot.',
};

function trimText(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  const slice = cleaned.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

function getVerdict(product: Product): BotVerdict {
  if (product.status === 'sold') {
    return { label: 'Sold Out', tone: 'error' };
  }
  if (product.aiVerified) {
    return { label: 'Remy Verified', tone: 'success' };
  }
  if (product.condition === 'new' || product.condition === 'like_new') {
    return { label: 'Mint Pick', tone: 'accent' };
  }
  if (product.price <= 500) {
    return { label: 'Budget Find', tone: 'success' };
  }
  return { label: 'Campus Pick', tone: 'default' };
}

export function generateProductBotBrief(product: Product): ProductBotBrief {
  const conditionLabel = CONDITION_LABELS[product.condition] ?? 'Good';
  const categoryLabel = CATEGORY_LABELS[product.category] ?? 'Campus Item';
  const sellerFirst = product.sellerName.trim().split(/\s+/)[0] || 'a student';
  const priceText = `₹${product.price.toLocaleString('en-IN')}`;
  const location = product.campusLocation?.trim();
  const rawDescription = product.description?.trim();

  let shortSummary: string;
  if (rawDescription && rawDescription.length > 0) {
    const snippet = trimText(rawDescription, 92);
    const hasPunctuation = /[.!?…]$/.test(snippet);
    shortSummary = `${snippet}${hasPunctuation ? '' : '.'} ${conditionLabel} ${categoryLabel.toLowerCase()} from ${sellerFirst}${location ? ` near ${location}` : ''}.`;
  } else {
    shortSummary = `${conditionLabel} ${categoryLabel.toLowerCase()} listed by ${sellerFirst} for ${priceText}${location ? ` at ${location}` : ''}. Ready for a quick campus meetup.`;
  }

  const verifiedNote = product.aiVerified
    ? 'AI-verified listing checks out.'
    : 'Listed by a verified campus peer.';
  const conditionReply = `${CONDITION_DETAILS[product.condition] ?? CONDITION_DETAILS.good} ${verifiedNote}`;

  const priceTier =
    product.price <= 400
      ? 'Wallet-friendly student pricing under ₹400.'
      : product.price <= 1500
        ? 'Solid mid-range campus price compared to buying retail.'
        : 'Higher-value item — inspect carefully before paying.';
  const dealReply = `${priceTier} Tip: ${CATEGORY_TIPS[product.category] ?? CATEGORY_TIPS.other}`;

  const availabilityNote =
    product.status === 'sold'
      ? 'This listing is marked sold.'
      : 'Available right now for campus pickup.';
  const meetupReply = `Seller: ${product.sellerName}. ${
    location ? `Meetup spot: ${location}.` : 'Suggest meeting at Main Library or Student Center.'
  } ${availabilityNote}`;

  return {
    headline: `${product.title} • ${priceText}`,
    conditionLabel,
    categoryLabel,
    verdict: getVerdict(product),
    shortSummary,
    replies: {
      condition: conditionReply,
      deal: dealReply,
      meetup: meetupReply,
    },
  };
}
