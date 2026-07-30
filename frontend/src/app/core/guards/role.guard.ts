import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

// Se aplica junto a authGuard en rutas con `data: { roles: [...] }`. Sin esa data, deja pasar
// (no todas las rutas necesitan restricción de rol). El backend ya rechaza estas peticiones con
// 403 pase lo que pase aquí — este guard solo evita que un usuario sin permiso llegue a ver una
// página que de todas formas fallaría al cargar datos.
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data["roles"] as number[] | undefined;
  if (!allowedRoles || auth.hasRole(...allowedRoles)) return true;

  return router.parseUrl("/unauthorized");
};
