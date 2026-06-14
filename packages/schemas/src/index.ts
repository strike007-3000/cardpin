import { z } from "zod";

// Regex patterns
export const ID_REGEX = /^[a-z0-9-]+$/;
export const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

// Category Registry
export const CATEGORY_REGISTRY = [
  "groceries",
  "travel",
  "dining",
  "fuel",
  "utilities",
  "online-shopping",
  "transport",
  "entertainment",
  "fallback"
] as const;

export const CategorySchema = z.enum(CATEGORY_REGISTRY);

export const IssuerSchema = z.object({
  id: z.string().regex(ID_REGEX, "ID must be lowercase kebab-case"),
  name: z.string().min(1)
});

export const SourceAttributionSchema = z.object({
  sourceUrl: z.string()
    .min(1, "Source URL cannot be empty")
    .url("Source URL must be a valid URL")
    .startsWith("https://", "Source URL must use HTTPS (secured)"),
  verifiedAt: z.string().min(1, "Verification date cannot be empty"), // ISO Date string
  verifiedBy: z.string().min(1, "Verifier cannot be empty")
});

export const CardSchema = z.object({
  id: z.string().regex(ID_REGEX, "ID must be lowercase kebab-case"),
  name: z.string().min(1),
  issuerId: z.string().regex(ID_REGEX, "Issuer ID must be lowercase kebab-case"),
  country: z.string().regex(COUNTRY_CODE_REGEX, "Country must be a 2-letter uppercase ISO code"),
  network: z.string().min(1), // e.g. visa, mastercard, amex
  annualFee: z.number().nonnegative().optional().default(0),
  fxFeePercentage: z.number().nonnegative().optional().default(0), // FX fee offset (e.g. 0.0299)
  currency: z.string().regex(/^[A-Z]{3}$/, "Currency must be a 3-letter uppercase code").optional().default("EUR"),
  rewardRules: z.array(z.string().regex(ID_REGEX)).optional().default([]), // references RewardRule.id
  source: z.string().min(1).optional().default("community"),
  audience: z.enum(["consumer", "business"]).optional(),
  sourceProof: SourceAttributionSchema.optional(),
  lastUpdated: z.string().min(1) // ISO date
});

export const MerchantSchema = z.object({
  id: z.string().regex(ID_REGEX, "ID must be lowercase kebab-case"),
  name: z.string().min(1),
  country: z.string().regex(COUNTRY_CODE_REGEX, "Country must be a 2-letter uppercase ISO code"),
  categories: z.array(CategorySchema).default([]),
  website: z.string().url().optional().default(""),
  lastUpdated: z.string().min(1).optional().default(new Date().toISOString())
});

export const RewardRuleSchema = z.object({
  id: z.string().regex(ID_REGEX, "ID must be lowercase kebab-case"),
  cardId: z.string().regex(ID_REGEX),
  country: z.string().regex(COUNTRY_CODE_REGEX, "Country must be a 2-letter uppercase ISO code"),

  // Search dimensions
  category: CategorySchema.optional(),
  merchantId: z.string().regex(ID_REGEX).optional(),

  // Reward definition
  rewardType: z.enum(["cashback_percentage", "fixed_cashback", "points", "miles"]),
  rewardValue: z.number().nonnegative("Reward value must be non-negative"),

  conditions: z
    .object({
      minSpend: z.number().nonnegative().optional(),
      cap: z.number().nonnegative().optional()
    })
    .optional()
    .default({}),

  cap: z.number().nonnegative().optional(),

  // Source Attribution
  source: SourceAttributionSchema,
  lastUpdated: z.string().min(1).optional().default(new Date().toISOString())
});

export const CountryIssuersJsonSchema = z.object({
  issuers: z.array(IssuerSchema)
});

export const CountryCardsJsonSchema = z.object({
  cards: z.array(CardSchema)
});

export const CountryMerchantsJsonSchema = z.object({
  merchants: z.array(MerchantSchema)
});

export const CountryRewardRulesJsonSchema = z.object({
  rewardRules: z.array(RewardRuleSchema)
});

export const CountryDatasetSchema = z.object({
  country: z.string().regex(COUNTRY_CODE_REGEX),
  issuers: z.array(IssuerSchema),
  cards: z.array(CardSchema),
  merchants: z.array(MerchantSchema),
  rewardRules: z.array(RewardRuleSchema)
});

export type Card = z.infer<typeof CardSchema>;
export type Merchant = z.infer<typeof MerchantSchema>;
export type RewardRule = z.infer<typeof RewardRuleSchema>;
export type Issuer = z.infer<typeof IssuerSchema>;
export type CountryDataset = z.infer<typeof CountryDatasetSchema>;
