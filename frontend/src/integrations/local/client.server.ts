import { auth } from "@/lib/scope-store";

export const localAdminClient = {
  auth: {
    getUser() {
      return { data: { user: auth.getUser() }, error: null };
    },
  },
};

