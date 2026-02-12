import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { connectionManager, dataSources } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { logger } from "../utils/logger";
import { storage } from "../storage";
import { connectToDataSource } from "../services/dataConnector";
import { encryptConnectionData } from "../utils/encryption";
import { captureException } from "../config/sentry";

const router = Router();

// Encryption helpers
if (!process.env.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable is required");
}
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate ENCRYPTION_KEY length (AES-256 requires 32 bytes = 64 hex characters)
if (ENCRYPTION_KEY.length !== 64) {
  throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes for AES-256)");
}
const IV_LENGTH = 16;

// Lightspeed OAuth constants
const LS_AUTH_URL = process.env.LS_AUTH_URL || "https://cloud.lightspeedapp.com/auth/oauth/authorize";
const LS_TOKEN_URL = process.env.LS_TOKEN_URL || "https://cloud.lightspeedapp.com/auth/oauth/token";
const LS_API_BASE = process.env.LS_API_BASE || "https://api.lightspeedapp.com/API";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// POST /api/lightspeed/start - Initiate OAuth flow
router.post(
  "/lightspeed/start",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in session
    req.session.oauthState = state;
    req.session.oauthProvider = "lightspeed";
    (req.session as any).userId = userId;

    // Require LS_REDIRECT_URI to be explicitly set
    if (!process.env.LS_REDIRECT_URI) {
      throw new Error("LS_REDIRECT_URI must be set");
    }
    const redirectUri = process.env.LS_REDIRECT_URI;

    // Build authorization URL
    const authUrl = new URL(LS_AUTH_URL);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", process.env.LS_CLIENT_ID || "");
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("scope", "employee:inventory employee:reports");
    authUrl.searchParams.append("state", state);

    logger.info("Lightspeed OAuth initiated", {
      userId,
      redirectUri,
      authUrl: authUrl.toString(),
    });

    res.json({ redirect: authUrl.toString() });
  },
);

// GET /api/oauth/callback/lightspeed - OAuth callback
router.get(
  "/oauth/callback/lightspeed",
  async (req: Request, res: Response) => {
    const { code, state } = req.query;

    // Verify state
    if (!state || state !== req.session.oauthState) {
      return res.status(400).send("Invalid state parameter");
    }

    const userId = (req.session as any).userId;

    if (!userId) {
      logger.error("Lightspeed OAuth: Missing session data", {
        hasUserId: !!userId,
        sessionKeys: Object.keys(req.session || {}),
      });
      return res
        .status(400)
        .send("Session expired. Please try connecting again.");
    }

    try {
      // Require LS_REDIRECT_URI to be explicitly set
      if (!process.env.LS_REDIRECT_URI) {
        throw new Error("LS_REDIRECT_URI must be set");
      }
      const redirectUri = process.env.LS_REDIRECT_URI;

      const clientId = process.env.LS_CLIENT_ID;
      const clientSecret = process.env.LS_CLIENT_SECRET;

      // Validate required credentials
      if (!clientId || !clientSecret) {
        logger.error("Lightspeed OAuth: Missing client credentials", { userId });
        captureException(new Error("Missing Lightspeed credentials"), {
          context: "lightspeed_oauth",
          userId,
        });
        return res.status(500).send("Server configuration error: Missing Lightspeed credentials");
      }

      logger.info("Lightspeed OAuth: Exchanging code for tokens", { userId });

      // Exchange code for tokens (standard OAuth 2.0, no PKCE)
      const tokenResponse = await fetch(LS_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        logger.error("Lightspeed OAuth: Token exchange failed", {
          userId,
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText,
        });
        captureException(new Error(`Token exchange failed: ${tokenResponse.status}`), {
          context: "lightspeed_oauth",
          userId,
          status: tokenResponse.status,
          error: errorText,
        });
        return res.status(502).send("Failed to exchange authorization code. Please try again.");
      }

      const tokenData = await tokenResponse.json();
      logger.info("Lightspeed OAuth: Token exchange successful", {
        userId,
        tokenKeys: Object.keys(tokenData),
      });
      
      const { access_token, refresh_token, expires_in } = tokenData;
      
      // account_id might not be in token response - try to get it from API if missing
      let account_id = tokenData.account_id;
      
      if (!account_id) {
        logger.info("Lightspeed OAuth: No account_id in token response, fetching from API", { userId });
        try {
          const accountResponse = await fetch(`${LS_API_BASE}/Account.json`, {
            headers: {
              Authorization: `Bearer ${access_token}`,
              Accept: "application/json",
            },
          });
          
          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            // Lightspeed returns { Account: { accountID: "..." } } or similar
            account_id = accountData.Account?.accountID || accountData.Account?.id || accountData.accountID;
            logger.info("Lightspeed OAuth: Fetched account_id from API", {
              userId,
              accountId: account_id,
            });
          } else {
            const errorText = await accountResponse.text();
            logger.error("Lightspeed OAuth: Failed to fetch account info", {
              userId,
              status: accountResponse.status,
              error: errorText,
            });
          }
        } catch (err) {
          logger.error("Lightspeed OAuth: Error fetching account", {
            userId,
            error: err instanceof Error ? err.message : "Unknown error",
          });
          captureException(err instanceof Error ? err : new Error(String(err)), {
            context: "lightspeed_fetch_account",
            userId,
          });
        }
      }
      
      // If still no account_id, fail the connection - we need a real account ID
      if (!account_id) {
        logger.error("Lightspeed OAuth: Could not obtain account_id", { userId });
        captureException(new Error("Could not obtain Lightspeed account_id"), {
          context: "lightspeed_oauth",
          userId,
        });
        return res.status(502).send("Failed to retrieve Lightspeed account information. Please try again or contact support.");
      }

      // Calculate expiration time with buffer
      const expiresAt = new Date(Date.now() + (expires_in - 120) * 1000);

      // Encrypt tokens
      const encryptedAccessToken = encrypt(access_token);
      const encryptedRefreshToken = encrypt(refresh_token);

      // Upsert connection
      const existingConnection = await db
        .select()
        .from(connectionManager)
        .where(
          and(
            eq(connectionManager.userId, userId),
            eq(connectionManager.provider, "lightspeed"),
          ),
        )
        .limit(1);

      let connectionId: number;
      if (existingConnection.length > 0) {
        // Update existing connection
        connectionId = existingConnection[0].id;
        await db
          .update(connectionManager)
          .set({
            accountId: account_id,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
            status: "active",
            updatedAt: new Date(),
            accountLabel: `Lightspeed Account`,
            scopesGranted: ["employee:inventory", "employee:reports"],
            healthStatus: "healthy",
            lastHealthCheck: new Date(),
          })
          .where(
            and(
              eq(connectionManager.userId, userId),
              eq(connectionManager.provider, "lightspeed"),
            ),
          );
      } else {
        // Create new connection
        const [newConnection] = await db.insert(connectionManager).values({
          userId,
          provider: "lightspeed",
          accountId: account_id,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          status: "active",
          accountLabel: `Lightspeed Account`,
          scopesGranted: ["employee:inventory", "employee:reports"],
          isReadOnly: true,
          healthStatus: "healthy",
          lastHealthCheck: new Date(),
        }).returning();
        connectionId = newConnection.id;
      }

      // Create or update dataSource entry for chat system
      // Check if dataSource already exists
      const existingDataSource = await db
        .select()
        .from(dataSources)
        .where(
          and(
            eq(dataSources.userId, userId),
            eq(dataSources.type, "lightspeed"),
            eq(dataSources.connectionType, "live"),
          ),
        )
        .limit(1);

      // Prepare connection data for dataSource (encrypted)
      const connectionDataForDataSource = {
        accountId: account_id,
        accessToken: access_token, // Will be encrypted by encryptConnectionData
        refreshToken: refresh_token, // Will be encrypted by encryptConnectionData
        connectionManagerId: connectionId,
      };
      const encryptedConnectionData = encryptConnectionData(connectionDataForDataSource);

      // Try to sync initial data
      let schema: any = null;
      let rowCount = 0;
      let initialData: any[] = [];
      
      try {
        logger.info("Starting initial Lightspeed data sync", { userId, accountId: account_id });
        
        const syncResult = await connectToDataSource("lightspeed", {
          accountId: account_id,
          accessToken: access_token,
          environment: "production",
        });

        if (syncResult.success && syncResult.data) {
          schema = syncResult.schema;
          rowCount = syncResult.rowCount || 0;
          initialData = syncResult.data || [];
          logger.info("Initial Lightspeed data sync successful", {
            userId,
            accountId: account_id,
            rowCount,
          });
        } else {
          logger.warn("Initial Lightspeed data sync failed", {
            userId,
            accountId: account_id,
            error: syncResult.error,
          });
          // Continue anyway - data source will be created but empty
        }
      } catch (syncError) {
        logger.error("Error during initial Lightspeed data sync", {
          userId,
          accountId: account_id,
          error: syncError instanceof Error ? syncError.message : "Unknown error",
        });
        captureException(syncError instanceof Error ? syncError : new Error(String(syncError)), {
          context: "lightspeed_initial_sync",
          userId,
          accountId: account_id,
        });
        // Continue anyway - data source will be created but empty
      }

      if (existingDataSource.length > 0) {
        // Update existing dataSource
        await db
          .update(dataSources)
          .set({
            connectionData: encryptedConnectionData,
            schema: schema || existingDataSource[0].schema,
            rowCount: rowCount || existingDataSource[0].rowCount,
            status: "active",
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(dataSources.id, existingDataSource[0].id));

        // Clear old data and insert new if we have data
        if (initialData.length > 0) {
          await storage.clearDataRows(existingDataSource[0].id);
          await storage.insertDataRows(existingDataSource[0].id, initialData);
        }

        logger.info("Lightspeed dataSource updated", {
          userId,
          dataSourceId: existingDataSource[0].id,
          rowCount,
        });
      } else {
        // Create new dataSource
        const newDataSource = await storage.createDataSource({
          userId,
          name: "Lightspeed Retail",
          type: "lightspeed",
          connectionType: "live",
          connectionData: encryptedConnectionData,
          schema: schema,
          rowCount: rowCount,
          status: "active",
          lastSyncAt: new Date(),
          syncFrequency: 60, // Sync every 60 minutes
        });

        // Insert initial data if available
        if (initialData.length > 0) {
          await storage.insertDataRows(newDataSource.id, initialData);
        }

        logger.info("Lightspeed dataSource created", {
          userId,
          dataSourceId: newDataSource.id,
          rowCount,
        });
      }

      // Clear session
      delete req.session.oauthState;
      delete req.session.oauthProvider;
      delete (req.session as any).userId;

      // Redirect to chat page
      res.redirect("/chat?source=lightspeed");
    } catch (error) {
      logger.error("Lightspeed OAuth callback error", {
        userId: (req.session as any).userId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: "lightspeed_oauth_callback",
        userId: (req.session as any).userId,
      });
      res.status(500).send("An error occurred during authentication. Please try again.");
    }
  },
);

// Helper to ensure valid token (exported for use in other services)
export async function ensureLightspeedToken(
  userId: number,
): Promise<{ accessToken: string; accountId: string } | null> {
  const connection = await db
    .select()
    .from(connectionManager)
    .where(
      and(
        eq(connectionManager.userId, userId),
        eq(connectionManager.provider, "lightspeed"),
        eq(connectionManager.status, "active"),
      ),
    )
    .limit(1);

  if (connection.length === 0) {
    return null;
  }

  const conn = connection[0];
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // Check if token needs refresh
  if (conn.expiresAt && conn.expiresAt < fiveMinutesFromNow) {
    try {
      // Refresh token
      const refreshToken = decrypt(conn.refreshToken!);
      const clientId = process.env.LS_CLIENT_ID || "";
      const clientSecret = process.env.LS_CLIENT_SECRET || "";

      const response = await fetch(LS_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Lightspeed token refresh failed", {
          userId,
          status: response.status,
          error: errorText,
        });
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      const newExpiresAt = new Date(
        Date.now() + (data.expires_in - 120) * 1000,
      );

      // Update tokens
      await db
        .update(connectionManager)
        .set({
          accessToken: encrypt(data.access_token),
          refreshToken: data.refresh_token
            ? encrypt(data.refresh_token)
            : conn.refreshToken,
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(connectionManager.id, conn.id));

      return {
        accessToken: data.access_token,
        accountId: conn.accountId!,
      };
    } catch (error) {
      logger.error("Lightspeed token refresh failed", {
        userId,
        connectionId: conn.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: "lightspeed_token_refresh",
        userId,
        connectionId: conn.id,
      });
      // Mark connection as unhealthy but don't immediately revoke - might be temporary
      await db
        .update(connectionManager)
        .set({
          healthStatus: "unhealthy",
          lastHealthCheck: new Date(),
        })
        .where(eq(connectionManager.id, conn.id));
      return null;
    }
  }

  return {
    accessToken: decrypt(conn.accessToken!),
    accountId: conn.accountId!,
  };
}

// GET /api/lightspeed/test - Test connection
router.get(
  "/lightspeed/test",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const tokenData = await ensureLightspeedToken(userId);
    if (!tokenData) {
      return res
        .status(404)
        .json({ error: "No active Lightspeed connection found" });
    }

    try {
      // Test API call
      const apiUrl = `${LS_API_BASE}/Account/${tokenData.accountId}.json`;
      let response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
          Accept: "application/json",
        },
      });

      // If 401, try refreshing token once
      if (response.status === 401) {
        const newTokenData = await ensureLightspeedToken(userId);
        if (!newTokenData) {
          return res.status(502).json({ error: "Failed to refresh token" });
        }

        response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${newTokenData.accessToken}`,
            Accept: "application/json",
          },
        });
      }

      if (!response.ok) {
        throw new Error(`API test failed: ${response.status}`);
      }

      const data = await response.json();

      // Update health check
      await db
        .update(connectionManager)
        .set({
          lastHealthCheck: new Date(),
          healthStatus: "healthy",
          lastUsedAt: new Date(),
        })
        .where(
          and(
            eq(connectionManager.userId, userId),
            eq(connectionManager.provider, "lightspeed"),
          ),
        );

      res.json({
        ok: true,
        accountId: tokenData.accountId,
        name: data.Account?.name || "Unknown",
      });
    } catch (error) {
      logger.error("Lightspeed test connection failed", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: "lightspeed_test",
        userId,
      });
      res.status(502).json({ error: "Failed to connect to Lightspeed API" });
    }
  },
);

// DELETE /api/connections/lightspeed - Disconnect
router.delete(
  "/connections/lightspeed",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    await db
      .update(connectionManager)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        accessToken: null,
        refreshToken: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(connectionManager.userId, userId),
          eq(connectionManager.provider, "lightspeed"),
        ),
      );

    res.json({ ok: true });
  },
);

export default router;
