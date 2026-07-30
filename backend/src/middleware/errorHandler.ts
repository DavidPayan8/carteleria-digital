import { ErrorRequestHandler } from "express";
import { z, ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    // .flatten() está deprecado en Zod v4 en favor de z.treeifyError().
    res.status(400).json({ error: "Validation error", details: z.treeifyError(err) });
    return;
  }
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({ error: err.message ?? "Internal server error" });
};
