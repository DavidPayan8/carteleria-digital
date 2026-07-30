import rateLimit from "express-rate-limit";

// Limita intentos de login por IP: mitiga fuerza bruta de contraseñas sin necesitar
// bloqueo por cuenta (que requeriría tocar el modelo de User). 10 intentos / 15 min
// es holgado para un usuario legítimo que se equivoca de contraseña un par de veces,
// pero corta en seco un ataque automatizado.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de inicio de sesión. Inténtalo de nuevo en unos minutos." },
});
