import { auth } from "@/lib/scope-store";

export type LocalQueryResult<T> = {
  data: T | null;
  error: Error | null;
};

function ok<T>(data: T): LocalQueryResult<T> {
  return { data, error: null };
}

function unsupported(feature: string): LocalQueryResult<never> {
  return {
    data: null,
    error: new Error(`${feature} is not available in the local frontend adapter.`),
  };
}

export const localClient = {
  auth: {
    getUser() {
      return ok({ user: auth.getUser() });
    },
    getSession() {
      const user = auth.getUser();
      return ok({
        session: auth.isLoggedIn() && user
          ? {
              user,
              access_token: `local:${user.id}`,
              token_type: "bearer",
            }
          : null,
      });
    },
    signOut() {
      auth.logout();
      return ok(null);
    },
  },
  from(table: string) {
    return {
      select() {
        return unsupported(`Local table queries for "${table}"`);
      },
      insert() {
        return unsupported(`Local inserts for "${table}"`);
      },
      update() {
        return unsupported(`Local updates for "${table}"`);
      },
      delete() {
        return unsupported(`Local deletes for "${table}"`);
      },
    };
  },
};

