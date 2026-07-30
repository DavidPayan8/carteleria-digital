import { NextFunction, Request, RequestHandler, Response } from "express";

// @types/express v5 tipa los route params como `string | string[]` (para admitir rutas
// con wildcards tipo *splat). Esta app solo usa params nombrados simples (:id, :itemId),
// así que se tipan aquí como string para no tener que castear en cada controller.
interface StringParams {
  [key: string]: string;
}

// Express 4 no reenvía rechazos de promesas al error handler automáticamente.
export const asyncHandler =
  (fn: (req: Request<StringParams>, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req as unknown as Request<StringParams>, res, next).catch(next);
  };
