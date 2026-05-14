import { User } from "../models/User.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { unauthenticated, AppError } from "../utils/errors.js";

export async function optionalAuthMiddleware(req, _res, next) {
  try {
    const header = req.get("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return next();
    }

    const token = header.replace("Bearer ", "").trim();
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw unauthenticated("TOKEN_EXPIRED", "Access token expired");
      }
      throw unauthenticated();
    }

    const user = await User.findById(payload.sub);
    if (!user || user.disabledAt) {
      throw new AppError(403, "ACCOUNT_DISABLED", "Account disabled");
    }

    req.user = {
      id: user.id,
      _id: user._id,
      email: user.email,
      role: user.role,
      roleVariant: user.roleVariant,
      institution: user.institution,
      founder: user.founder,
    };
    next();
  } catch (error) {
    next(error);
  }
}


export async function authMiddleware(req, _res, next) {
  try {
    const header = req.get("Authorization");
    if (!header?.startsWith("Bearer ")) {
      throw unauthenticated();
    }

    const token = header.replace("Bearer ", "").trim();
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw unauthenticated("TOKEN_EXPIRED", "Access token expired");
      }
      throw unauthenticated();
    }

    const user = await User.findById(payload.sub);
    if (!user || user.disabledAt) {
      throw new AppError(403, "ACCOUNT_DISABLED", "Account disabled");
    }

    req.user = {
      id: user.id,
      _id: user._id,
      email: user.email,
      role: user.role,
      roleVariant: user.roleVariant,
      institution: user.institution,
      founder: user.founder,
    };
    next();
  } catch (error) {
    next(error);
  }
}
