import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAsyncData } from "./use-async-data";

/**
 * Tests for useAsyncData hook (#180).
 *
 * Tester generisk datahenting med loading/error/retry.
 */

describe("useAsyncData", () => {
  it("starter med loading=true og data=null", () => {
    const fetcher = vi.fn(() => new Promise<string>(() => {})); // aldri resolver
    const { result } = renderHook(() => useAsyncData(fetcher, []));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("setter data ved vellykket henting", async () => {
    const fetcher = vi.fn(async () => "test-data");
    const { result } = renderHook(() => useAsyncData(fetcher, []));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBe("test-data");
    expect(result.current.error).toBeNull();
  });

  it("setter error ved feil", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("Nettverksfeil");
    });
    const { result } = renderHook(() => useAsyncData(fetcher, []));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Nettverksfeil");
  });

  it("konverterer ikke-Error til Error", async () => {
    const fetcher = vi.fn(async () => {
      throw "streng-feil";
    });
    const { result } = renderHook(() => useAsyncData(fetcher, []));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("streng-feil");
  });

  it("retry kjører fetch på nytt", async () => {
    let callCount = 0;
    const fetcher = vi.fn(async () => {
      callCount++;
      if (callCount === 1) throw new Error("Første forsøk feilet");
      return "success";
    });

    const { result } = renderHook(() => useAsyncData(fetcher, []));

    // Vent på første feil
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error?.message).toBe("Første forsøk feilet");

    // Retry
    result.current.retry();

    await waitFor(() => expect(result.current.data).toBe("success"));
    expect(result.current.error).toBeNull();
  });

  it("mottar AbortSignal i fetcher", async () => {
    let receivedSignal: AbortSignal | null = null;
    const fetcher = vi.fn(async (signal: AbortSignal) => {
      receivedSignal = signal;
      return "ok";
    });

    const { result } = renderHook(() => useAsyncData(fetcher, []));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });

  it("kjører fetcher på nytt ved dependency-endring", async () => {
    const fetcher = vi.fn(async () => "data");

    const { result, rerender } = renderHook(
      ({ dep }) => useAsyncData(fetcher, [dep]),
      { initialProps: { dep: 1 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    rerender({ dep: 2 });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
