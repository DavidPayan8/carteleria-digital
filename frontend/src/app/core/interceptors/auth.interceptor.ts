import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.logout();
      } else if (error.status === 403) {
        // El backend ya aplica el scoping multi-tenant en cada petición; si de todas formas
        // llega un 403 (link a un recurso de otra organización, permisos cambiados en otra
        // pestaña, etc.) no dejamos la página a medio cargar — mandamos a /unauthorized.
        void router.navigateByUrl("/unauthorized");
      }
      return throwError(() => error);
    }),
  );
};
