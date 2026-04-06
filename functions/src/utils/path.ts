/**
 * Path parsing utilities for Cloud Functions routing.
 * Centralizes path parameter extraction logic.
 */

/**
 * Extract a path parameter from a URL path.
 *
 * Example:
 *   extractPathParam("/api-keys/abc123", "/api-keys/") => "abc123"
 *   extractPathParam("/admin/users/uid123", "/admin/users/") => "uid123"
 */
export function extractPathParam(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) return null;
  const param = path.substring(prefix.length);
  return param || null;
}

/**
 * Extract multiple consecutive path parameters.
 *
 * Example:
 *   extractPathParams("/school-admin/users/uid123/role", "/school-admin/users/") => ["uid123", "role"]
 */
export function extractPathParams(path: string, prefix: string): string[] {
  if (!path.startsWith(prefix)) return [];
  const remaining = path.substring(prefix.length);
  return remaining.split("/").filter(Boolean);
}

/**
 * Check if a path ends with a specific suffix.
 *
 * Example:
 *   hasPathSuffix("/admin/users/uid123/disable", "/disable") => true
 */
export function hasPathSuffix(path: string, suffix: string): boolean {
  return path.endsWith(suffix);
}

/**
 * Extract path parameter and check for suffix.
 * Useful for routes like DELETE /admin/users/:uid
 *
 * Example:
 *   extractPathParamWithSuffix("/admin/users/uid123", "/admin/users/") => "uid123"
 */
export function extractPathParamWithSuffix(
  path: string,
  prefix: string,
  suffix?: string
): string | null {
  if (!path.startsWith(prefix)) return null;

  let remaining = path.substring(prefix.length);

  if (suffix && remaining.endsWith(suffix)) {
    remaining = remaining.substring(0, remaining.length - suffix.length);
  }

  return remaining || null;
}
