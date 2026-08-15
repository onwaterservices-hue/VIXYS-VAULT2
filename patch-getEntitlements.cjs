const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

const regex = /export function getEntitlementsFromSubscription\([\s\S]*?isStripeVerified: false,\n  };\n}/m;
// Let's use a simpler replace by doing string indexOf

let start = content.indexOf('export function getEntitlementsFromSubscription(');
if (start === -1) {
  console.log("NOT FOUND");
  process.exit(1);
}
let endStr = `  return {
    entitlements: {
      starter: false,
      proQuant: false,
      eliteQuant: false,
      scalping15s: false,
      canAccessProDesks: false,
      canAccessAdminPanel: false,
    },
    normalizedPlan: 'NONE',
    normalizedStatus: cleanStatus === 'CANCELED' ? 'canceled' : 'inactive',
    isStripeVerified: false,
  };
}`;
let end = content.indexOf(endStr, start);
if (end === -1) {
  console.log("END NOT FOUND");
  process.exit(1);
}
end += endStr.length;

const replacement = `export function getEntitlementsFromSubscription(
  planStr: string,
  statusStr: string,
  isOwnerOrAdmin: boolean = false,
  trialConsumed: boolean = false,
  trialExpiresAt?: string
): {
  entitlements: EntitlementsMap;
  normalizedPlan: 'STARTER' | 'PRO_QUANT' | 'ELITE_QUANT' | 'FREE_TRIAL' | 'NONE';
  normalizedStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive' | 'trial_expired' | 'discord_unverified';
  isStripeVerified: boolean;
} {
  if (isOwnerOrAdmin) {
    return {
      entitlements: {
        starter: true,
        proQuant: true,
        eliteQuant: true,
        scalping15s: true,
        canAccessProDesks: true,
        canAccessAdminPanel: true,
      },
      normalizedPlan: 'ELITE_QUANT',
      normalizedStatus: 'active',
      isStripeVerified: true,
    };
  }

  const cleanPlan = (planStr || '').toUpperCase().trim();
  const cleanStatus = (statusStr || '').toUpperCase().trim();

  // Active Stripe Plan Check
  if (cleanStatus === 'ACTIVE' || cleanStatus === 'PAST_DUE' || cleanStatus === 'TRIALING') {
    if (cleanPlan.includes('ELITE')) {
      return {
        entitlements: {
          starter: true,
          proQuant: true,
          eliteQuant: true,
          scalping15s: true,
          canAccessProDesks: true,
          canAccessAdminPanel: false,
        },
        normalizedPlan: 'ELITE_QUANT',
        normalizedStatus: cleanStatus === 'PAST_DUE' ? 'past_due' : 'active',
        isStripeVerified: true,
      };
    } else if (cleanPlan.includes('PRO')) {
      return {
        entitlements: {
          starter: true,
          proQuant: true,
          eliteQuant: false,
          scalping15s: true,
          canAccessProDesks: true,
          canAccessAdminPanel: false,
        },
        normalizedPlan: 'PRO_QUANT',
        normalizedStatus: cleanStatus === 'PAST_DUE' ? 'past_due' : 'active',
        isStripeVerified: true,
      };
    } else if (cleanPlan.includes('STARTER')) {
      return {
        entitlements: {
          starter: true,
          proQuant: false,
          eliteQuant: false,
          scalping15s: false,
          canAccessProDesks: false,
          canAccessAdminPanel: false,
        },
        normalizedPlan: 'STARTER',
        normalizedStatus: cleanStatus === 'PAST_DUE' ? 'past_due' : 'active',
        isStripeVerified: true,
      };
    }
  }

  // Free trial handling
  const isTrial = cleanPlan.includes('FREE_TRIAL') || cleanPlan === 'FREE' || cleanPlan === 'TRIAL' || cleanPlan === 'NONE' || cleanPlan === '';
  if (isTrial) {
    const hasActiveTrial = trialExpiresAt && Date.now() < new Date(trialExpiresAt).getTime() && !trialConsumed;
    
    if (!hasActiveTrial) {
      const isDiscordUnverified = !trialExpiresAt && !trialConsumed;
      return {
        entitlements: {
          starter: false,
          proQuant: false,
          eliteQuant: false,
          scalping15s: false,
          canAccessProDesks: false,
          canAccessAdminPanel: false,
        },
        normalizedPlan: 'FREE_TRIAL',
        normalizedStatus: isDiscordUnverified ? 'discord_unverified' : 'trial_expired',
        isStripeVerified: false,
      };
    }

    // Active trial grants temporary Pro Desks preview
    return {
      entitlements: {
        starter: true,
        proQuant: true,
        eliteQuant: false,
        scalping15s: true,
        canAccessProDesks: true,
        canAccessAdminPanel: false,
      },
      normalizedPlan: 'FREE_TRIAL',
      normalizedStatus: 'trialing',
      isStripeVerified: false,
    };
  }

  return {
    entitlements: {
      starter: false,
      proQuant: false,
      eliteQuant: false,
      scalping15s: false,
      canAccessProDesks: false,
      canAccessAdminPanel: false,
    },
    normalizedPlan: 'NONE',
    normalizedStatus: cleanStatus === 'CANCELED' ? 'canceled' : 'inactive',
    isStripeVerified: false,
  };
}`;

content = content.substring(0, start) + replacement + content.substring(end);
fs.writeFileSync('backend.ts', content);
console.log('Successfully patched getEntitlementsFromSubscription with substr');
