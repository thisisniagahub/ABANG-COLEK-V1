export interface ProductOnboardingDraft {
  sku?: string;
  name: string;
  packSize: number;
  unitName: string;
  priceSen?: number;
  description: string;
  lifecycle: 'draft' | 'pending_approval' | 'published' | 'retired';
  provenanceRights?: string;
  ownerApproved: boolean;
  unverifiedFields: string[];
  isArtworkOrMascot?: boolean;
}

export interface LocationOnboardingDraft {
  id: string;
  name: string;
  address: string;
  openingStockQuantity?: number;
  approved?: boolean;
  hours?: string;
  verifiedAt?: string;
  batchId?: string;
}

export interface DealerTermsDraft {
  minimumQuantity: number;
  packMultiple: number;
  priceBasisPoints: number;
  ownership: 'owned' | 'consigned';
  returnRules: string;
  approved: boolean;
}

export interface OnboardingValidationResult {
  isValid: boolean;
  canCommit: boolean;
  missingFields: string[];
  warnings: string[];
  unknowns: string[];
  rejectedItems: { name: string; reason: string }[];
}

export interface OnboardingCommitResult {
  committedProductsCount: number;
  publishedProductsCount: number;
  locationsCount: number;
  catalogueVersion: number;
  committedAt: string;
}
