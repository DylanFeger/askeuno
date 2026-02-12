/**
 * Object ACL (Access Control List) Module
 * Handles file-level permissions for the storage system
 * 
 * Note: This module is now integrated with localStorageService
 * and no longer depends on Google Cloud Storage
 */

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

/**
 * Check if the requested permission is allowed based on the granted permission
 */
function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

/**
 * Check if a user can access an object based on ACL policy
 */
export function canAccessObjectWithPolicy({
  userId,
  aclPolicy,
  requestedPermission,
}: {
  userId?: string;
  aclPolicy: ObjectAclPolicy | null;
  requestedPermission: ObjectPermission;
}): boolean {
  if (!aclPolicy) {
    return false;
  }

  // Public objects are always accessible for read
  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  // Access control requires the user id
  if (!userId) {
    return false;
  }

  // The owner of the object can always access it
  if (aclPolicy.owner === userId) {
    return true;
  }

  // Check ACL rules (simplified - no group support yet)
  for (const rule of aclPolicy.aclRules || []) {
    if (isPermissionAllowed(requestedPermission, rule.permission)) {
      // In the future, implement group membership checks here
      return false;
    }
  }

  return false;
}

// Legacy exports for backward compatibility
// These are now implemented in objectStorage.ts using local file system

export async function setObjectAclPolicy(
  _objectPath: string,
  _aclPolicy: ObjectAclPolicy,
): Promise<void> {
  // This is handled by objectStorage.ts now
  // Kept for backward compatibility
}

export async function getObjectAclPolicy(
  _objectPath: string,
): Promise<ObjectAclPolicy | null> {
  // This is handled by objectStorage.ts now
  // Kept for backward compatibility
  return null;
}

export async function canAccessObject({
  userId,
  objectPath,
  requestedPermission,
}: {
  userId?: string;
  objectPath: string;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  // This is handled by objectStorage.ts now
  // Default to owner-only access
  return false;
}