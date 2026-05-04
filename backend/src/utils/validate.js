import { ZodError } from "zod";
import { validationError } from "./errors.js";

export function validate(schema, source = "body") {
  return (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(validationError(error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        }))));
        return;
      }
      next(error);
    }
  };
}

