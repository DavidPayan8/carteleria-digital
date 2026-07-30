import type { CurrentPlaylistResponse, PairResponse } from "./types";

const PLAYER_VERSION = "player-web-1.0";

export class AuthError extends Error {}
export class ApiError extends Error {}

export async function pairScreen(apiBase: string, pairingCode: string): Promise<PairResponse> {
  const res = await fetch(`${apiBase}/screens/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingCode }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(body.error ?? `Error ${res.status}`);
  }
  return res.json();
}

export async function fetchCurrentPlaylist(apiBase: string, token: string): Promise<CurrentPlaylistResponse> {
  const res = await fetch(`${apiBase}/player/current-playlist`, {
    headers: { Authorization: `Bearer ${token}`, "x-player-version": PLAYER_VERSION },
  });
  if (res.status === 401) throw new AuthError("Token de pantalla revocado o inválido");
  if (!res.ok) throw new ApiError(`Error ${res.status}`);
  return res.json();
}
