import React from 'react';
import { BTCTicker } from '../../types';
import { useCanonical15mDecision, FeedHealthStatus, NormalizedLifecycleState } from '../../hooks/useCanonical15mDecision';

export type ModuleCategory =
  | 'VIXY'
  | 'MARKET'
  | 'INTELLIGENCE'
  | 'CROSS-VENUE'
  | 'HISTORY';

export type ModuleSize = '1x1' | '2x1' | '2x2' | '3x2' | '4x2';

export interface ModuleDimensions {
  w: number; // Grid columns (1 to 12)
  h: number; // Grid rows (1 to 8)
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
}

export interface VixyModuleProps {
  instanceId: string;
  moduleId: string;
  config?: Record<string, any>;
  // Global Shared Props passed down without re-subscriptions
  canonical15m: ReturnType<typeof useCanonical15mDecision>['decision'];
  dataHealthStatus?: FeedHealthStatus;
  feedError?: string | null;
  normalizedLifecycle?: NormalizedLifecycleState;
  localUpdatedAt?: number;
  ticker: BTCTicker | null;
  ethTicker?: BTCTicker | null;
  solTicker?: BTCTicker | null;
  isEditMode?: boolean;
  onOpenFocusMode?: () => void;
  onRemoveModule?: () => void;
}

export interface VixyModuleDefinition {
  id: string; // e.g. 'vixy.bias'
  name: string; // e.g. 'VIXY BIAS'
  category: ModuleCategory;
  description: string;
  iconName: string; // Lucide icon identifier
  defaultDimensions: ModuleDimensions;
  requiredEntitlement?: 'FREE' | 'PRO' | 'ELITE';
  isAvailable: boolean; // false if underlying data stream is not provisioned
  unavailableReason?: string;
  component: React.ComponentType<VixyModuleProps>;
  focusComponent?: React.ComponentType<VixyModuleProps>;
}

export interface ModuleInstanceConfig {
  instanceId: string;
  moduleId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sizeMode?: 'default' | 'compact' | 'expanded';
  configuration?: Record<string, any>;
  config?: Record<string, any>;
}

export interface UserWorkspace {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  layout: ModuleInstanceConfig[];
  modules: string[];
  settings: Record<string, any>;
  version: number;
  layoutVersion: number;
  isDefault?: boolean;
}

export interface WorkspacePreset {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  layout: ModuleInstanceConfig[];
}
