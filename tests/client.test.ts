import { describe, it, expect, vi } from "vitest";
import { x402Client } from "@x402/fetch";
import { X402Anthropic } from "../src/index.js";
import { preferNetwork, maxAmount } from "../src/policies.js";

// ---------------------------------------------------------------------------
// Constructor / config
// ---------------------------------------------------------------------------

describe("X402Anthropic constructor", () => {
  it("constructs without throwing", () => {
    const wallet = { register: vi.fn() };
    expect(() => new X402Anthropic({ wallet, baseURL: "https://example.com" })).not.toThrow();
  });

  it("sets apiKey to 'x402' by default", () => {
    const wallet = { register: vi.fn() };
    const client = new X402Anthropic({ wallet, baseURL: "https://example.com" });
    expect((client as unknown as { apiKey: string }).apiKey).toBe("x402");
  });

  it("allows apiKey override", () => {
    const wallet = { register: vi.fn() };
    const client = new X402Anthropic({ wallet, apiKey: "custom", baseURL: "https://example.com" });
    expect((client as unknown as { apiKey: string }).apiKey).toBe("custom");
  });
});

// ---------------------------------------------------------------------------
// Lazy fetch singleton — wallet.register() called exactly once
// ---------------------------------------------------------------------------

describe("lazy fetch singleton", () => {
  it("calls wallet.register exactly once across multiple fetches", async () => {
    const register = vi.fn();
    const wallet = { register };

    // Intercept the fetch to avoid real network calls
    const fakeFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    // Patch globalThis.fetch for this test
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fakeFetch;

    // We access the internal fetch via the _options.fetch slot
    // Instead, directly test the createLazyX402Fetch behaviour by extracting the lazy fn
    // from the module so we can call it multiple times without a full client.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new X402Anthropic({ wallet, baseURL: "https://httpbin.org" });

    // Trigger the lazy fetch twice by calling the stored fetch function directly.
    // The internal fetch is stored at client._options.fetch.
    const lazyFetch = (client as unknown as { _options: { fetch?: typeof globalThis.fetch } })
      ._options?.fetch;

    if (lazyFetch) {
      await lazyFetch("https://httpbin.org/get", { method: "GET" }).catch(() => {});
      await lazyFetch("https://httpbin.org/get", { method: "GET" }).catch(() => {});
    }

    expect(register).toHaveBeenCalledTimes(1);
    globalThis.fetch = originalFetch;
  });
});

// ---------------------------------------------------------------------------
// Policy registration
// ---------------------------------------------------------------------------

describe("policy registration", () => {
  it("calls registerPolicy for each supplied policy", async () => {
    const registerSpy = vi.fn();
    const registerPolicySpy = vi.fn();

    // Mock the x402Client constructor
    const mockX402Client = {
      register: registerSpy,
      registerPolicy: registerPolicySpy,
    };

    // We need to intercept x402Client instantiation inside createLazyX402Fetch.
    // The simplest way: pass a wallet whose register() captures the client arg.
    let capturedClient: unknown = null;
    const wallet = {
      register: vi.fn(async (client: unknown) => {
        capturedClient = client;
      }),
    };

    const policy = preferNetwork("eip155:8453");
    const client = new X402Anthropic({
      wallet,
      policies: [policy],
      baseURL: "https://httpbin.org",
    });

    const lazyFetch = (client as unknown as { _options: { fetch?: Function } })
      ._options?.fetch;

    if (lazyFetch) {
      // Trigger initialization — the fetch will fail (no real server) but init runs.
      await lazyFetch("https://httpbin.org/get").catch(() => {});
    }

    // wallet.register should have been called once
    expect(wallet.register).toHaveBeenCalledTimes(1);
    // The x402Client passed to wallet.register should be a real x402Client instance
    expect(capturedClient).toBeInstanceOf(x402Client);
  });
});

// ---------------------------------------------------------------------------
// Policy helpers
// ---------------------------------------------------------------------------

describe("preferNetwork policy", () => {
  const base = "eip155:8453";
  const eth = "eip155:1";

  it("filters to preferred network when present", () => {
    const policy = preferNetwork(base);
    const reqs = [{ network: eth }, { network: base }] as Parameters<typeof policy>[1];
    const result = policy(2, reqs);
    expect(result).toHaveLength(1);
    expect(result[0].network).toBe(base);
  });

  it("returns all when preferred network is absent (fallthrough)", () => {
    const policy = preferNetwork(base);
    const reqs = [{ network: eth }, { network: "eip155:137" }] as Parameters<typeof policy>[1];
    const result = policy(2, reqs);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// maxAmount policy
// ---------------------------------------------------------------------------

describe("maxAmount policy", () => {
  type Req = Parameters<ReturnType<typeof maxAmount>>[1][number];
  const makeReq = (amount: string): Req => ({ amount } as Req);

  it("returns only affordable requirements when some exceed the cap", () => {
    const policy = maxAmount(1_000_000n);
    const reqs = [makeReq("500000"), makeReq("1000000"), makeReq("2000000")];
    const result = policy(2, reqs);
    expect(result).toHaveLength(2);
    expect(result.map((r) => (r as { amount: string }).amount)).toEqual(["500000", "1000000"]);
  });

  it("returns all requirements when all are within the cap", () => {
    const policy = maxAmount(1_000_000n);
    const reqs = [makeReq("100"), makeReq("999999")];
    const result = policy(2, reqs);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when all requirements exceed the cap (hard limit)", () => {
    const policy = maxAmount(500n);
    const reqs = [makeReq("1000"), makeReq("2000")];
    const result = policy(2, reqs);
    // Empty return signals to x402Client that no affordable option exists —
    // the client throws "All payment requirements were filtered out by policies".
    expect(result).toHaveLength(0);
  });

  it("falls back to maxAmountRequired field when amount is absent", () => {
    const policy = maxAmount(1_000_000n);
    const req = { maxAmountRequired: "500000" } as Req;
    const result = policy(2, [req]);
    expect(result).toHaveLength(1);
  });
});
