import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "dist");

await rm(distDir, { recursive: true, force: true });

await build({
  entryPoints: [path.resolve(__dirname, "src/index.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: distDir,
  outExtension: { ".js": ".mjs" },
  logLevel: "info",
  sourcemap: "linked",
  external: [
    "*.node",
    "sharp", "better-sqlite3", "sqlite3", "canvas",
    "bcrypt", "argon2", "fsevents", "pg-native",
    "nodemailer", "@prisma/client", "sequelize",
    "mysql2", "oracledb", "mongodb-client-encryption",
  ],
  banner: {
    js: `import { createRequire as __cr } from 'node:module';
import __path from 'node:path';
import __url from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __path.dirname(globalThis.__filename);
`,
  },
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
});
