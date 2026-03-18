import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exchangeCodeForTokens, getAccessibleCustomers, refreshAccessToken } from "@/lib/googleAds";
import { encrypt } from "@/lib/crypto";
import { upsertGoogleAdsIntegration, auditLog } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(new URL("/app/settings?error=oauth_denied", req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/app/settings?error=missing_params", req.url));
  }

  try {
    // Decode & verify state
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    const { workspaceId, userId: stateUserId } = stateData;
    if (stateUserId !== userId) {
      return NextResponse.redirect(new URL("/app/settings?error=state_mismatch", req.url));
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    const { access_token, refresh_token, scope } = tokens;

    if (!refresh_token) {
      return NextResponse.redirect(new URL("/app/settings?error=no_refresh_token", req.url));
    }

    // Get customer id from accessible customers
    const customerIds = await getAccessibleCustomers(access_token);
    const customerId = customerIds[0] ?? "unknown";

    // Encrypt and store
    const refreshTokenEnc = await encrypt(refresh_token);
    await upsertGoogleAdsIntegration(workspaceId, customerId, refreshTokenEnc, scope);

    await auditLog(workspaceId, userId, "google_ads_connected", { customerId, scope });

    return NextResponse.redirect(new URL("/app/settings?success=connected", req.url));
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.redirect(new URL("/app/settings?error=callback_failed", req.url));
  }
}
