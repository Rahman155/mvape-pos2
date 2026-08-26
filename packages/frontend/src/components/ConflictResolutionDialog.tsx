/**
 * ConflictResolutionDialog Component
 * Dialog for resolving conflicts between local and remote versions
 * Allows users to choose between local, remote, or merged version
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  ConflictItem,
  ConflictResolution,
  ConflictResolver,
  getConflictResolver,
} from '@/lib/conflictResolution';

export interface ConflictResolutionDialogProps {
  /**
   * Is dialog open
   */
  isOpen: boolean;

  /**
   * Conflict item to resolve
   */
  conflict: ConflictItem | null;

  /**
   * Callback when conflict is resolved
   */
  onResolve: (resolution: ConflictResolution) => void;

  /**
   * Callback when dialog is closed
   */
  onClose: () => void;

  /**
   * CSS class name
   */
  className?: string;
}

/**
 * Display formatted JSON
 */
const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

/**
 * Compare two values and return differences
 */
const getDifferences = (local: unknown, remote: unknown): string[] => {
  const differences: string[] = [];

  if (typeof local === 'object' && typeof remote === 'object' && local !== null && remote !== null) {
    const localObj = local as Record<string, unknown>;
    const remoteObj = remote as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(localObj), ...Object.keys(remoteObj)]);

    for (const key of allKeys) {
      if (localObj[key] !== remoteObj[key]) {
        differences.push(
          `${key}: local="${localObj[key]}" vs remote="${remoteObj[key]}"`
        );
      }
    }
  } else if (local !== remote) {
    differences.push(`local="${local}" vs remote="${remote}"`);
  }

  return differences;
};

/**
 * ConflictResolutionDialog Component
 */
export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  conflict,
  onResolve,
  onClose,
  className = '',
}) => {
  const [selectedOption, setSelectedOption] = useState<'local' | 'remote' | 'merge'>('local');
  const [isResolving, setIsResolving] = useState(false);

  const resolver = getConflictResolver();

  /**
   * Handle resolution
   */
  const handleResolve = useCallback(async () => {
    if (!conflict) return;

    try {
      setIsResolving(true);

      let resolution: ConflictResolution;

      if (selectedOption === 'merge') {
        resolution = resolver.resolveConflict({
          ...conflict,
          localVersion: conflict.localVersion,
          remoteVersion: conflict.remoteVersion,
        });
      } else {
        const customConflict: ConflictItem = {
          ...conflict,
          localVersion:
            selectedOption === 'local' ? conflict.localVersion : conflict.remoteVersion,
          remoteVersion:
            selectedOption === 'remote' ? conflict.remoteVersion : conflict.localVersion,
          localTimestamp:
            selectedOption === 'local'
              ? conflict.localTimestamp
              : conflict.remoteTimestamp,
          remoteTimestamp:
            selectedOption === 'remote'
              ? conflict.remoteTimestamp
              : conflict.localTimestamp,
        };

        const lwwResolver = new ConflictResolver('LWW');
        resolution = lwwResolver.resolveConflict(customConflict);
      }

      onResolve(resolution);
      onClose();
    } catch (error) {
      console.error('[ConflictResolutionDialog] Resolution failed:', error);
    } finally {
      setIsResolving(false);
    }
  }, [conflict, selectedOption, resolver, onResolve, onClose]);

  if (!isOpen || !conflict) {
    return null;
  }

  const differences = getDifferences(conflict.localVersion, conflict.remoteVersion);
  const localTime = new Date(conflict.localTimestamp).toLocaleString();
  const remoteTime = new Date(conflict.remoteTimestamp).toLocaleString();

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-white text-xl font-bold">
            Resolve Conflict
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            {conflict.entityType} ({conflict.id})
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Differences */}
          {differences.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Differences Found:
              </h3>
              <ul className="space-y-1">
                {differences.map((diff, index) => (
                  <li key={index} className="text-sm text-yellow-800">
                    • {diff}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Options */}
          <div className="space-y-4">
            {/* Local Version Option */}
            <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              style={{
                borderColor: selectedOption === 'local' ? '#3b82f6' : '#e5e7eb',
              }}
            >
              <input
                type="radio"
                name="resolution"
                value="local"
                checked={selectedOption === 'local'}
                onChange={() => setSelectedOption('local')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  Use Local Version
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Timestamp: {localTime}
                </div>
                <div className="bg-gray-100 rounded p-2 mt-2 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                  {formatJson(conflict.localVersion)}
                </div>
              </div>
            </label>

            {/* Remote Version Option */}
            <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              style={{
                borderColor: selectedOption === 'remote' ? '#3b82f6' : '#e5e7eb',
              }}
            >
              <input
                type="radio"
                name="resolution"
                value="remote"
                checked={selectedOption === 'remote'}
                onChange={() => setSelectedOption('remote')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  Use Remote Version
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Timestamp: {remoteTime}
                </div>
                <div className="bg-gray-100 rounded p-2 mt-2 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                  {formatJson(conflict.remoteVersion)}
                </div>
              </div>
            </label>

            {/* Merge Option */}
            <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              style={{
                borderColor: selectedOption === 'merge' ? '#3b82f6' : '#e5e7eb',
              }}
            >
              <input
                type="radio"
                name="resolution"
                value="merge"
                checked={selectedOption === 'merge'}
                onChange={() => setSelectedOption('merge')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  Merge Both Versions
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Combine changes from both versions (for objects only)
                </div>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">
              Resolution Strategy
            </h4>
            <p className="text-sm text-blue-800">
              {selectedOption === 'local' &&
                'Your local changes will be kept. This may overwrite updates made on the server.'}
              {selectedOption === 'remote' &&
                'The remote version will be used. Your local changes will be discarded.'}
              {selectedOption === 'merge' &&
                'An attempt will be made to merge both versions. This preserves changes from both.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 flex justify-end space-x-3 border-t">
          <button
            onClick={onClose}
            disabled={isResolving}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            {isResolving && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isResolving ? 'Resolving...' : 'Apply Resolution'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

ConflictResolutionDialog.displayName = 'ConflictResolutionDialog';

export default ConflictResolutionDialog;
