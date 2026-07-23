import { z } from 'zod';

export const checkoutSchema = z.object({
  amount: z.number().positive('Amount must be positive').min(1, 'Amount must be at least 1'),
  currency: z.enum(['USD', 'NGN'], { message: 'Currency must be USD or NGN' }),
  type: z.enum(['stripe', 'paystack'], { message: 'Payment type must be stripe or paystack' }),
});

export const marketplaceBuySchema = z.object({
  provider_api_id: z.union([z.string(), z.number()], { required_error: 'Provider API ID is required' }),
});

export const adminSettingsSchema = z.object({
  profit_margin: z.number().nonnegative('Profit margin must be zero or greater').optional(),
  affiliate_percentage: z.number().nonnegative('Affiliate percentage must be zero or greater').optional(),
  brand_pricing: z.record(z.string(), z.object({
    minPriceUsd: z.coerce.number().nonnegative(),
    multiplier: z.coerce.number().nonnegative(),
  })).optional(),
}).refine(data => data.profit_margin !== undefined || data.affiliate_percentage !== undefined || data.brand_pricing !== undefined, {
  message: 'No fields to update',
});

// Helper to format validation errors
export const getFieldErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  error.issues.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  return errors;
};
