import React from 'react';
import { BTCTicker, Candle } from '../types';
import { CryptoPredictionCenterView } from './CryptoPredictionCenterView';

export interface VixyLockViewProps {
  ticker?: BTCTicker;
  candles?: Candle[];
  userEmail?: string;
  onOpenTerminal?: () => void;
  onOpenReplay?: () => void;
  onOpenPricing?: () => void;
  isAuthenticated?: boolean;
  hasActiveAccess?: boolean;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const VixyLockView: React.FC<VixyLockViewProps> = (props) => {
  return <CryptoPredictionCenterView {...props} />;
};
