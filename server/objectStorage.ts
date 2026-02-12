/**
 * Object Storage Service
 * Unified interface for file storage - supports local files and cloud storage
 * Replaces Replit-specific object storage with a portable implementation
 */

import { Response } from "express";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { createReadStream, existsSync, mkdirSync } from "fs";
import { logger } from "./utils/logger";

// Storage configuration
const STORAGE_MODE = process.env.STORAGE_MODE || "local";
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), "uploads");
const PUBLIC_STORAGE_PATH = path.join(LOCAL_STORAGE_PATH, "public");
const PRIVATE_STORAGE_PATH = path.join(LOCAL_STORAGE_PATH, "private");

// Ensure storage directories exist
if (STORAGE_MODE === "local") {
  [LOCAL_STORAGE_PATH, PUBLIC_STORAGE_PATH, PRIVATE_STORAGE_PATH].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

// ACL Types
export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// File metadata interface
interface FileMetadata {
  contentType: string;
  size: number;
  owner?: string;
  visibility?: "public" | "private";
  uploadDate: string;
}

/**
 * Object Storage Service - Local Implementation
 */
export class ObjectStorageService {
  constructor() {}

  /**
   * Get the storage path based on visibility
   */
  private getStoragePath(visibility: "public" | "private" = "private"): string {
    return visibility === "public" ? PUBLIC_STORAGE_PATH : PRIVATE_STORAGE_PATH;
  }

  /**
   * Get full file path for a key
   */
  private getFilePath(key: string, visibility: "public" | "private" = "private"): string {
    return path.join(this.getStoragePath(visibility), key);
  }

  /**
   * Get metadata file path for a key
   */
  private getMetadataPath(key: string, visibility: "public" | "private" = "private"): string {
    return path.join(this.getStoragePath(visibility), `${key}.meta.json`);
  }

  /**
   * Search for a public object by file path
   */
  async searchPublicObject(filePath: string): Promise<string | null> {
    const fullPath = path.join(PUBLIC_STORAGE_PATH, filePath);
    
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      return null;
    }
  }

  /**
   * Upload a file
   */
  async uploadObject(
    key: string,
    buffer: Buffer,
    contentType: string,
    options: { owner?: string; visibility?: "public" | "private" } = {}
  ): Promise<string> {
    const visibility = options.visibility || "private";
    const filePath = this.getFilePath(key, visibility);
    const metadataPath = this.getMetadataPath(key, visibility);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    // Write metadata
    const metadata: FileMetadata = {
      contentType,
      size: buffer.length,
      owner: options.owner,
      visibility,
      uploadDate: new Date().toISOString(),
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    logger.info("File uploaded", { key, visibility, size: buffer.length });

    return `/api/files/${visibility}/${key}`;
  }

  /**
   * Download an object to response
   */
  async downloadObject(
    key: string,
    res: Response,
    options: { visibility?: "public" | "private"; cacheTtlSec?: number } = {}
  ): Promise<void> {
    const visibility = options.visibility || "private";
    const cacheTtlSec = options.cacheTtlSec || 3600;
    const filePath = this.getFilePath(key, visibility);
    const metadataPath = this.getMetadataPath(key, visibility);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Get metadata
      let metadata: FileMetadata | null = null;
      try {
        const metaContent = await fs.readFile(metadataPath, "utf-8");
        metadata = JSON.parse(metaContent);
      } catch {
        // Metadata might not exist
      }

      // Get file stats
      const stats = await fs.stat(filePath);

      // Set headers
      res.set({
        "Content-Type": metadata?.contentType || "application/octet-stream",
        "Content-Length": stats.size.toString(),
        "Cache-Control": `${visibility === "public" ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      // Stream file
      const stream = createReadStream(filePath);

      stream.on("error", (err) => {
        logger.error("Stream error", { error: err, key });
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      logger.error("Error downloading file", { error, key });
      if (!res.headersSent) {
        res.status(404).json({ error: "File not found" });
      }
    }
  }

  /**
   * Get upload URL for a new object
   */
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    // Return a local API endpoint for uploads
    return `/api/files/upload/${objectId}`;
  }

  /**
   * Get file by object path
   */
  async getObjectEntityFile(objectPath: string): Promise<{ path: string; exists: boolean }> {
    // Handle /objects/ prefix
    let key = objectPath;
    if (objectPath.startsWith("/objects/")) {
      key = objectPath.slice(9);
    }

    // Try private first, then public
    const privatePath = this.getFilePath(key, "private");
    const publicPath = this.getFilePath(key, "public");

    try {
      await fs.access(privatePath);
      return { path: privatePath, exists: true };
    } catch {
      try {
        await fs.access(publicPath);
        return { path: publicPath, exists: true };
      } catch {
        return { path: privatePath, exists: false };
      }
    }
  }

  /**
   * Normalize object path
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // Handle local paths
    if (rawPath.startsWith(LOCAL_STORAGE_PATH)) {
      const relativePath = rawPath.slice(LOCAL_STORAGE_PATH.length + 1);
      return `/objects/${relativePath}`;
    }

    // Handle API URLs
    if (rawPath.startsWith("/api/files/")) {
      const key = rawPath.slice(11);
      return `/objects/${key}`;
    }

    return rawPath;
  }

  /**
   * Set ACL policy for an object (stores in metadata)
   */
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    
    // Extract key from path
    let key = normalizedPath;
    if (normalizedPath.startsWith("/objects/")) {
      key = normalizedPath.slice(9);
    }

    // Update metadata
    const metadataPath = this.getMetadataPath(key, aclPolicy.visibility);
    
    try {
      const existing = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(existing);
      metadata.owner = aclPolicy.owner;
      metadata.visibility = aclPolicy.visibility;
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch {
      // Create new metadata
      const metadata: FileMetadata = {
        contentType: "application/octet-stream",
        size: 0,
        owner: aclPolicy.owner,
        visibility: aclPolicy.visibility,
        uploadDate: new Date().toISOString(),
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    return normalizedPath;
  }

  /**
   * Check if user can access object
   */
  async canAccessObjectEntity({
    userId,
    objectPath,
    requestedPermission,
  }: {
    userId?: string;
    objectPath: string;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    try {
      // Extract key
      let key = objectPath;
      if (objectPath.startsWith("/objects/")) {
        key = objectPath.slice(9);
      }

      // Try to get metadata
      for (const visibility of ["private", "public"] as const) {
        try {
          const metadataPath = this.getMetadataPath(key, visibility);
          const content = await fs.readFile(metadataPath, "utf-8");
          const metadata = JSON.parse(content);

          // Public objects are readable by anyone
          if (metadata.visibility === "public" && requestedPermission === ObjectPermission.READ) {
            return true;
          }

          // Owner can do anything
          if (metadata.owner === userId) {
            return true;
          }

          return false;
        } catch {
          continue;
        }
      }

      // No metadata found - deny by default
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Delete an object
   */
  async deleteObject(key: string, visibility: "public" | "private" = "private"): Promise<boolean> {
    const filePath = this.getFilePath(key, visibility);
    const metadataPath = this.getMetadataPath(key, visibility);

    try {
      await fs.unlink(filePath);
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata might not exist
      }
      logger.info("File deleted", { key, visibility });
      return true;
    } catch (error) {
      logger.error("Error deleting file", { error, key });
      return false;
    }
  }

  /**
   * List objects by prefix
   */
  async listObjects(
    prefix: string,
    visibility: "public" | "private" = "private"
  ): Promise<string[]> {
    const basePath = this.getStoragePath(visibility);
    const searchPath = path.join(basePath, prefix);

    try {
      const files = await fs.readdir(searchPath, { recursive: true });
      return files
        .filter(f => !f.toString().endsWith(".meta.json"))
        .map(f => path.join(prefix, f.toString()));
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const objectStorageService = new ObjectStorageService();

// Re-export for backward compatibility
export { ObjectAclPolicy };
export const canAccessObject = objectStorageService.canAccessObjectEntity.bind(objectStorageService);
export const setObjectAclPolicy = objectStorageService.trySetObjectEntityAclPolicy.bind(objectStorageService);
export const getObjectAclPolicy = async (path: string) => {
  // This is a stub for backward compatibility
  return null;
};