import React from 'react';
import { RiskTier, VarianceStatus, PriorityLevel, ActionStatus } from '../types';

interface StatusIndicatorProps {
  type: 'risk' | 'variance' | 'priority' | 'action';
  value: RiskTier | VarianceStatus | PriorityLevel | ActionStatus | string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ type, value, className = '' }) => {
  if (type === 'risk') {
    const risk = value as RiskTier;
    const dotColors: Record<RiskTier, string> = {
      Critical: 'bg-red-600',
      High: 'bg-amber-600',
      Moderate: 'bg-yellow-500',
      Low: 'bg-emerald-600',
    };
    const textColors: Record<RiskTier, string> = {
      Critical: 'text-red-700 font-semibold',
      High: 'text-amber-700 font-semibold',
      Moderate: 'text-yellow-800 font-medium',
      Low: 'text-emerald-700 font-medium',
    };

    return (
      <span className={`inline-flex items-center text-xs ${textColors[risk] || 'text-stone-700'} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${dotColors[risk] || 'bg-stone-400'}`} />
        <span>{risk}</span>
      </span>
    );
  }

  if (type === 'variance') {
    const status = value as VarianceStatus;
    const configs: Record<VarianceStatus, { label: string; dot: string; text: string }> = {
      G: { label: 'Zero Variance', dot: 'bg-emerald-600', text: 'text-emerald-700' },
      Y: { label: 'Discrepancy Logged', dot: 'bg-amber-500', text: 'text-amber-800' },
      R: { label: 'Critical Variance', dot: 'bg-red-600', text: 'text-red-700 font-semibold' },
      C: { label: 'Closed / Cleared', dot: 'bg-blue-500', text: 'text-blue-700' },
    };
    const config = configs[status] || { label: status, dot: 'bg-stone-400', text: 'text-stone-700' };

    return (
      <span className={`inline-flex items-center text-xs ${config.text} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${config.dot}`} />
        <span>{config.label}</span>
      </span>
    );
  }

  if (type === 'priority') {
    const p = value as PriorityLevel;
    const dotColors: Record<PriorityLevel, string> = {
      Critical: 'bg-red-600',
      High: 'bg-rose-500',
      Medium: 'bg-amber-500',
      Low: 'bg-stone-400',
    };
    return (
      <span className={`inline-flex items-center text-xs font-medium text-stone-800 ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${dotColors[p] || 'bg-stone-400'}`} />
        <span>{p} Priority</span>
      </span>
    );
  }

  if (type === 'action') {
    const s = value as ActionStatus;
    const configs: Record<ActionStatus, { dot: string; text: string }> = {
      Open: { dot: 'bg-red-500', text: 'text-red-700 font-semibold' },
      'In Progress': { dot: 'bg-amber-500', text: 'text-amber-800 font-medium' },
      Resolved: { dot: 'bg-emerald-600', text: 'text-emerald-700 font-medium' },
      Closed: { dot: 'bg-stone-400', text: 'text-stone-600' },
    };
    const conf = configs[s] || { dot: 'bg-stone-400', text: 'text-stone-700' };
    return (
      <span className={`inline-flex items-center text-xs ${conf.text} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${conf.dot}`} />
        <span>{s}</span>
      </span>
    );
  }

  return <span className={`text-xs text-stone-700 ${className}`}>{value}</span>;
};
