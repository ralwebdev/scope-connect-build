import { forbidden } from "../utils/errors.js";
import { hasPermission } from "../utils/roles.js";

export const requirePermission = (permission) => (req, _res, next) => {
  if (!hasPermission(req.user, permission)) {
    next(forbidden(`Missing permission: ${permission}`));
    return;
  }
  next();
};

