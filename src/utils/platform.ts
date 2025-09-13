/**
 * Platform detection and keyboard shortcut utilities
 */

/**
 * Detect if the user is on macOS
 */
export function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Get the appropriate modifier key symbol for the current platform
 */
export function getModifierKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/**
 * Get the appropriate modifier key name for the current platform
 */
export function getModifierKeyName(): string {
  return isMac() ? 'Cmd' : 'Ctrl';
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(key: string): string {
  return `${getModifierKey()}+${key.toUpperCase()}`;
}

/**
 * Check if the correct modifier key is pressed for the current platform
 */
export function isModifierPressed(event: KeyboardEvent | React.KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}