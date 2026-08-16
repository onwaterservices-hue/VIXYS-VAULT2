export interface StripePlanLinks {
  monthly: string;
  annual: string;
}

export const STRIPE_DAY_PASS_LINK = 'https://buy.stripe.com/5kQ6oGh118jMbh26Jj1oI0e';

export const STRIPE_PAYMENT_LINKS: Record<'STARTER' | 'PRO' | 'ELITE', StripePlanLinks> = {
  STARTER: {
    monthly: 'https://buy.stripe.com/bJeeVc4ef9nQ3OA2t31oI05',
    annual: 'https://buy.stripe.com/dRm14mdOPdE62Kw1oZ1oI06',
  },
  PRO: {
    monthly: 'https://buy.stripe.com/6oUeVc3ab43wbh20kV1oI02',
    annual: 'https://buy.stripe.com/5kQdR8cKLgQibh2ffP1oI04',
  },
  ELITE: {
    monthly: 'https://buy.stripe.com/cNifZg267gQibh2gjT1oI0',
    annual: 'https://buy.stripe.com/eVqdR8bGH9nQ70M3x71oI01',
  },
};

/**
 * Gets the official 24-Hour Day Pass checkout URL prefilled with client parameters
 */
export function getStripeDayPassUrl(params?: { email?: string; uid?: string }): string {
  try {
    const url = new URL(STRIPE_DAY_PASS_LINK);
    if (params?.email) {
      url.searchParams.set('prefilled_email', params.email);
    }
    if (params?.uid || params?.email) {
      url.searchParams.set('client_reference_id', params.uid || params.email || '');
    }
    return url.toString();
  } catch {
    return STRIPE_DAY_PASS_LINK;
  }
}

/**
 * Builds an official Stripe Checkout Payment Link with optional prefilled parameters
 */
export function getStripePaymentUrl(
  plan: 'STARTER' | 'PRO' | 'ELITE',
  interval: 'monthly' | 'annual' = 'annual',
  params?: {
    email?: string;
    uid?: string;
    promoCode?: string;
  }
): string {
  const normalizedPlan = (plan?.toUpperCase() || 'PRO') as 'STARTER' | 'PRO' | 'ELITE';
  const targetPlan = STRIPE_PAYMENT_LINKS[normalizedPlan] ? normalizedPlan : 'PRO';
  const targetInterval = interval === 'monthly' ? 'monthly' : 'annual';
  const baseUrl = STRIPE_PAYMENT_LINKS[targetPlan][targetInterval];

  try {
    const url = new URL(baseUrl);
    if (params?.email) {
      url.searchParams.set('prefilled_email', params.email);
    }
    if (params?.uid || params?.email) {
      url.searchParams.set('client_reference_id', params.uid || params.email || '');
    }
    if (params?.promoCode) {
      url.searchParams.set('prefilled_promo_code', params.promoCode);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}
