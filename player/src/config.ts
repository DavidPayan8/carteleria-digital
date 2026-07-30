/**
 * URL del backend: fija en tiempo de build (player/.env, VITE_API_BASE), no
 * editable desde la pantalla — el cliente no debe poder ni ver ni cambiar esto.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:4000/api";
