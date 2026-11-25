// mobile/components/index.ts
// Barrel export — import shared components from here.

// Clay components
export { ClayButton } from './clay/ClayButton';
export { ClayCard } from './clay/ClayCard';
export { ClayInput } from './clay/ClayInput';
export { ClayHeader } from './clay/ClayHeader';

// Product components
export { ProductCard } from './product/ProductCard';
export { StatusBadge } from './product/StatusBadge';
export { CategoryChip } from './product/CategoryChip';

// UI primitives
export { AppIcon } from './ui/AppIcon';
export { ClayText } from './ui/ClayText';
export { Icon } from './ui/Icon';

// Motion system
export * from './fx';
