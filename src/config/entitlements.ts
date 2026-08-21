export type PlanTier = 'NONE' | 'DAY_PASS' | 'STARTER' | 'PRO' | 'ELITE';

export interface PlanEntitlements {
  livePredictions: boolean;
  modelMarketProbability: boolean;
  confidenceFilter: 'NONE' | 'STANDARD_80' | 'HIGH_85' | 'CUSTOM';
  webTerminal: boolean;
  emailAlerts: boolean;
  orderbookDepth: boolean;
  takerCvd: boolean;
  historicalSetups: boolean;
  discordSignals: boolean;
  telegramSignals: boolean;
  realtimeSubSecond: boolean;
  advancedProtectionGates: boolean;
  customModelCalibration: boolean;
  priorityExecutionWebhooks: boolean;
  locks: boolean;
  duration?: '24H' | 'LIFETIME';
}

export const ENTITLEMENT_MATRIX: Record<PlanTier, PlanEntitlements> = {
  NONE: {
    livePredictions: false,
    modelMarketProbability: false,
    confidenceFilter: 'NONE',
    webTerminal: false,
    emailAlerts: false,
    orderbookDepth: false,
    takerCvd: false,
    historicalSetups: false,
    discordSignals: false,
    telegramSignals: false,
    realtimeSubSecond: false,
    advancedProtectionGates: false,
    customModelCalibration: false,
    priorityExecutionWebhooks: false,
    locks: false,
  },
  DAY_PASS: {
    livePredictions: true,
    modelMarketProbability: true,
    confidenceFilter: 'HIGH_85',
    webTerminal: true,
    emailAlerts: false,
    orderbookDepth: true,
    takerCvd: true,
    historicalSetups: true,
    discordSignals: true,
    telegramSignals: false,
    realtimeSubSecond: false,
    advancedProtectionGates: false,
    customModelCalibration: false,
    priorityExecutionWebhooks: false,
    locks: true,
    duration: '24H'
  },
  STARTER: {
    livePredictions: true,
    modelMarketProbability: true,
    confidenceFilter: 'STANDARD_80',
    webTerminal: true,
    emailAlerts: true,
    orderbookDepth: false,
    takerCvd: false,
    historicalSetups: false,
    discordSignals: false,
    telegramSignals: false,
    realtimeSubSecond: false,
    advancedProtectionGates: false,
    customModelCalibration: false,
    priorityExecutionWebhooks: false,
    locks: false,
  },
  PRO: {
    livePredictions: true,
    modelMarketProbability: true,
    confidenceFilter: 'HIGH_85',
    webTerminal: true,
    emailAlerts: true,
    orderbookDepth: true,
    takerCvd: true,
    historicalSetups: true,
    discordSignals: true,
    telegramSignals: true,
    realtimeSubSecond: false,
    advancedProtectionGates: false,
    customModelCalibration: false,
    priorityExecutionWebhooks: false,
    locks: true,
  },
  ELITE: {
    livePredictions: true,
    modelMarketProbability: true,
    confidenceFilter: 'CUSTOM',
    webTerminal: true,
    emailAlerts: true,
    orderbookDepth: true,
    takerCvd: true,
    historicalSetups: true,
    discordSignals: true,
    telegramSignals: true,
    realtimeSubSecond: true,
    advancedProtectionGates: true,
    customModelCalibration: true,
    priorityExecutionWebhooks: true,
    locks: true,
  }
};

export const getEntitlements = (plan: PlanTier): PlanEntitlements => {
  return ENTITLEMENT_MATRIX[plan] || ENTITLEMENT_MATRIX.NONE;
};
