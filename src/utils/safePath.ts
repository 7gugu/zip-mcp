import path from 'node:path';

const NULL_BYTE_PATTERN = /\0/;
const WINDOWS_DRIVE_PATTERN = /^[a-zA-Z]:[/\\]/;
const ABSOLUTE_PATH_PATTERN = /^[/\\]/;

/**
 * Resolve a ZIP entry path inside the output root, or throw if unsafe.
 */
export function assertSafeZipEntryPath(
  outputRoot: string,
  entryName: string,
): string {
  if (entryName === '' || entryName === '.') {
    throw new Error('Unsafe zip entry path: empty or invalid entry name');
  }

  if (NULL_BYTE_PATTERN.test(entryName)) {
    throw new Error('Unsafe zip entry path: entry name contains null byte');
  }

  if (ABSOLUTE_PATH_PATTERN.test(entryName) || WINDOWS_DRIVE_PATTERN.test(entryName)) {
    throw new Error(`Unsafe zip entry path: absolute path not allowed (${entryName})`);
  }

  const normalizedEntry = entryName.replace(/\\/g, '/');
  const segments = normalizedEntry.split('/').filter((segment) => segment.length > 0);

  if (segments.some((segment) => segment === '..')) {
    throw new Error(`Unsafe zip entry path: parent traversal not allowed (${entryName})`);
  }

  const resolvedRoot = path.resolve(outputRoot);
  const resolvedTarget = path.resolve(resolvedRoot, entryName);

  if (!isPathInsideRoot(resolvedRoot, resolvedTarget)) {
    throw new Error(`Unsafe zip entry path: escapes output directory (${entryName})`);
  }

  return resolvedTarget;
}

function isPathInsideRoot(resolvedRoot: string, resolvedTarget: string): boolean {
  const relative = path.relative(resolvedRoot, resolvedTarget);

  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
