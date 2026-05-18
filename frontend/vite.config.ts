import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiTarget = (env.VITE_API_BASE_URL || "http://127.0.0.1:5050").replace(
    "://localhost",
    "://127.0.0.1",
  );

  return {
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ...tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      react(),
      ...(command === "build"
        ? [
            cloudflare({
              viteEnvironment: { name: "ssr" },
            }),
          ]
        : []),
    ],
    define: Object.fromEntries(
      Object.entries(env).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
      watch: {
        ignored: [
          "**/backend/**",
          "**/node_modules/**",
          "**/.git/**",
          "**/uploads/**",
        ],
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100,
        },
      },
    },
    preview: {
      host: "::",
      port: 8080,
    },
  };
});
