import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "ctrader-exchange";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExchangeBody = {
  code: string;
  redirectUri: string;
  scope?: "accounts" | "trading" | string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error(`[${functionName}] auth.getUser failed`, { userError });
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const body = (await req.json()) as ExchangeBody;
    if (!body?.code || !body?.redirectUri) {
      return new Response(JSON.stringify({ error: "Missing code or redirectUri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("CTRADER_CLIENT_ID");
    const clientSecret = Deno.env.get("CTRADER_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error(`[${functionName}] Missing CTRADER_CLIENT_ID/CTRADER_CLIENT_SECRET`);
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scope = body.scope ?? "trading";

    const tokenUrl = new URL("https://openapi.ctrader.com/apps/token");
    tokenUrl.searchParams.set("grant_type", "authorization_code");
    tokenUrl.searchParams.set("code", body.code);
    tokenUrl.searchParams.set("redirect_uri", body.redirectUri);
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);

    console.log(`[${functionName}] Exchanging code for token`, {
      userId: user.id,
      scope,
      redirectUri: body.redirectUri,
    });

    const resp = await fetch(tokenUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data || data.errorCode) {
      console.error(`[${functionName}] cTrader token exchange failed`, {
        status: resp.status,
        data,
      });
      return new Response(
        JSON.stringify({
          error: "cTrader token exchange failed",
          details: data?.description ?? data,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = data.accessToken as string;
    const refreshToken = data.refreshToken as string;
    const tokenType = (data.tokenType as string) ?? "bearer";
    const expiresIn = Number(data.expiresIn ?? 0);

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Store safe status
    const { error: connErr } = await adminClient.from("ctrader_connections").upsert({
      user_id: user.id,
      scope,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    });

    if (connErr) {
      console.error(`[${functionName}] Failed to upsert ctrader_connections`, { connErr });
      return new Response(JSON.stringify({ error: connErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store sensitive tokens
    const { error: tokErr } = await adminClient.from("ctrader_tokens").upsert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenType,
      expires_at: expiresAt,
      scope,
    });

    if (tokErr) {
      console.error(`[${functionName}] Failed to upsert ctrader_tokens`, { tokErr });
      return new Response(JSON.stringify({ error: tokErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        scope,
        expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`[${functionName}] Unexpected error`, { error });
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
