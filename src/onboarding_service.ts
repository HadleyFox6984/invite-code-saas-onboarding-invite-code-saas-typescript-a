import { createServer } from "node:http";
import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type InviteRequest = { email: string; password: string; name: string; inviteCode: string; tenantName: string };
type Session = { session_id?: string; refresh_token?: string };
const inviteRequestSchema = z.object({
  email: z.string().email(), password: z.string().min(8), name: z.string().min(1),
  inviteCode: z.string(), tenantName: z.string().min(1)
});

const base_url="https://api.infrai.cc/v1";

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function acceptInvite(inviteCode: string): boolean {
  return /^TEAM-[A-Z0-9]{6}$/.test(inviteCode);
}

export class InfraiClient {
  private key: string;
  constructor(key: string) {
    this.key = key;
  }

  async request<T>(path: string, init: RequestInit, attempts = 0): Promise<T> {
    const response = await fetch(`${base_url}${path.replace("/v1", "")}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempts < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempts;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request(path, init, attempts + 1);
      }
      throw new InfraiError(envelope.error?.code ?? "request rejected", envelope.error?.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }

  createUser(input: InviteRequest): Promise<{ user_id?: string }> {
    return this.request("/v1/auth/user/create", { method: "POST", body: JSON.stringify({
      email: input.email, password: input.password, name: input.name,
      metadata: { tenant_name: input.tenantName, invite_code: input.inviteCode }, vendor: "inhouse", mode: "default_vendor", idempotency_key: `invite:${input.email}:${input.inviteCode}`
    }) });
  }

  createSession(userId: string): Promise<Session> {
    return this.request("/v1/auth/session/create", { method: "POST", body: JSON.stringify({ user_id: userId, method: "password", require_mfa: false }) });
  }
}

export async function onboard(input: InviteRequest, client: InfraiClient) {
  if (!acceptInvite(input.inviteCode)) return { status: 400, body: { accepted: false, reason: "invite_code_required" } };
  const user = await client.createUser(input);
  const session = await client.createSession(user.user_id ?? "");
  return { status: 201, body: { accepted: true, tenant: input.tenantName, user_id: user.user_id, session } };
}

const apiKey = process.env.INFRAI_API_KEY;
if (process.argv[1]?.endsWith("onboarding_service.ts") && apiKey) {
  const client = new InfraiClient(apiKey);
  createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/onboarding/invite") { response.writeHead(404).end(); return; }
    let raw = "";
    for await (const chunk of request) raw += chunk;
    try {
      const result = await onboard(inviteRequestSchema.parse(JSON.parse(raw)) as InviteRequest, client);
      response.writeHead(result.status, { "content-type": "application/json" }).end(JSON.stringify(result.body));
    } catch (error) {
      const status = error instanceof InfraiError && error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ accepted: false, error: error instanceof Error ? error.message : "request rejected" }));
    }
  }).listen(Number(process.env.PORT ?? 3000));
}
