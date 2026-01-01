import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { connectionManager } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

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

    const clientId = process.env.LS_CLIENT_ID || "";
    const clientIdLength = clientId.length;
    const clientIdPreview = clientId.substring(0, 10);
    const clientIdSuffix = clientId.substring(clientId.length - 5);
    
    console.log("[Lightspeed OAuth] === DEBUG START ===");
    console.log("[Lightspeed OAuth] Client ID length:", clientIdLength);
    console.log("[Lightspeed OAuth] Client ID preview:", clientIdPreview + "..." + clientIdSuffix);
    console.log("[Lightspeed OAuth] Redirect URI:", redirectUri);
    console.log("[Lightspeed OAuth] Full auth URL:", authUrl.toString());
    console.log("[Lightspeed OAuth] === DEBUG END ===");

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
      console.error("Missing session data:", {
        userId: !!userId,
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
        console.error("[Lightspeed OAuth] Missing client credentials");
        return res.status(500).send("Server configuration error: Missing Lightspeed credentials");
      }

      console.log("[Lightspeed OAuth] Exchanging code for tokens...");

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
        console.error("[Lightspeed OAuth] Token exchange failed:", {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText,
        });
        return res.status(502).send("Failed to exchange authorization code. Please try again.");
      }

      const tokenData = await tokenResponse.json();
      console.log("[Lightspeed OAuth] Token response keys:", Object.keys(tokenData));
      
      const { access_token, refresh_token, expires_in } = tokenData;
      
      // account_id might not be in token response - try to get it from API if missing
      let account_id = tokenData.account_id;
      
      if (!account_id) {
        console.log("[Lightspeed OAuth] No account_id in token response, fetching from API...");
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
            console.log("[Lightspeed OAuth] Fetched account_id:", account_id);
          } else {
            console.error("[Lightspeed OAuth] Failed to fetch account info:", accountResponse.status);
          }
        } catch (err) {
          console.error("[Lightspeed OAuth] Error fetching account:", err);
        }
      }
      
      // If still no account_id, fail the connection - we need a real account ID
      if (!account_id) {
        console.error("[Lightspeed OAuth] Could not obtain account_id from token response or API");
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

      if (existingConnection.length > 0) {
        // Update existing connection
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
          })
          .where(
            and(
              eq(connectionManager.userId, userId),
              eq(connectionManager.provider, "lightspeed"),
            ),
          );
      } else {
        // Create new connection
        await db.insert(connectionManager).values({
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
        });
      }

      // Clear session
      delete req.session.oauthState;
      delete req.session.oauthProvider;
      delete (req.session as any).userId;

      // Redirect to chat page
      res.redirect("/chat?source=lightspeed");
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send("An error occurred during authentication");
    }
  },
);

// Helper to ensure valid token
async function ensureLightspeedToken(
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
        console.error(
          "Token refresh failed with status:",
          response.status,
          "Error:",
          errorText,
        );
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
      console.error("Token refresh failed:", error);
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
      console.error("Lightspeed test failed:", error);
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
