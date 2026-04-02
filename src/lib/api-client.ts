"use client";

import { auth } from "@/lib/firebase/auth";
import { getCsrfToken } from "@/lib/csrf";
import type { ApiResponse } from "@/types";

// Base-URL for API — bruker hosting rewrite (/api/** → api-funksjonen)
const API_BASE = "/api";

type RequestOptions = {
  /** HTTP-metode (standard: GET) */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request body — serialiseres automatisk til JSON */
  body?: unknown;
  /** Ekstra headers */
  headers?: Record<string, string>;
  /** Hopp over auth-token (for offentlige endepunkter) */
  noAuth?: boolean;
};

/**
 * Typed HTTP-klient som automatisk:
 * - Setter Firebase Auth ID-token i Authorization-header
 * - Serialiserer/deserialiserer JSON
 * - Returnerer typed ApiResponse<T>
 *
 * Bruk:
 *   const res = await fetchApi<User>("/me");
 *   if (res.success) console.log(res.data.uid);
 *
 *   const res = await fetchApi<Note>("/notes", {
 *     method: "POST",
 *     body: { title: "Ny notat", content: "Innhold" },
 *   });
 */
export async function fetchApi<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, noAuth = false } = options;

  // Hent ID-token fra innlogget bruker
  if (!noAuth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch {
      // Ignorer — kallet går uten token
    }
  }

  // Sett Content-Type for requests med body
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // CSRF-token på muterende forespørsler (#139)
  if (method !== "GET") {
    headers["X-CSRF-Token"] = getCsrfToken();
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Nettverksfeil — prøv igjen senere",
    };
  }
}

/** Snarvei for GET-requests */
export async function apiGet<T>(path: string, noAuth = false) {
  return fetchApi<T>(path, { noAuth });
}

/** Snarvei for POST-requests */
export async function apiPost<T>(path: string, body: unknown) {
  return fetchApi<T>(path, { method: "POST", body });
}

/** Snarvei for PUT-requests */
export async function apiPut<T>(path: string, body: unknown) {
  return fetchApi<T>(path, { method: "PUT", body });
}

/** Snarvei for DELETE-requests */
export async function apiDelete<T>(path: string) {
  return fetchApi<T>(path, { method: "DELETE" });
}
