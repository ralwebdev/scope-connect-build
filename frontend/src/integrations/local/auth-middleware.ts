import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export type LocalAuthClaims = {
  sub: string;
  provider: "local";
};

export const requireLocalAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Response("Unauthorized: No request headers available", { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer local:")) {
      throw new Response("Unauthorized: Local bearer token required", { status: 401 });
    }

    const userId = authHeader.replace("Bearer local:", "").trim();
    if (!userId) {
      throw new Response("Unauthorized: No user ID found in token", { status: 401 });
    }

    return next({
      context: {
        userId,
        claims: { sub: userId, provider: "local" } satisfies LocalAuthClaims,
      },
    });
  },
);

