import { build } from "esbuild";
import { fileURLToPath } from "node:url";

let cachedOfflineClaimBundle: Promise<string> | null = null;

export function getOfflineClaimClientBundle(): Promise<string> {
  if (cachedOfflineClaimBundle === null) {
    cachedOfflineClaimBundle = buildOfflineClaimClientBundle();
  }

  return cachedOfflineClaimBundle;
}

async function buildOfflineClaimClientBundle(): Promise<string> {
  const entryPoint = fileURLToPath(new URL("./offline-claim-client.ts", import.meta.url));
  const injectFile = fileURLToPath(new URL("./browser-polyfills.ts", import.meta.url));
  const cryptoShim = fileURLToPath(new URL("./browser-crypto.ts", import.meta.url));

  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    write: false,
    minify: false,
    charset: "utf8",
    inject: [injectFile],
    loader: {
      ".wasm": "binary"
    },
    alias: {
      "node:crypto": cryptoShim
    },
    legalComments: "none"
  });

  const output = result.outputFiles[0];
  if (!output) {
    throw new Error("Offline claim bundle did not produce any output.");
  }

  return output.text;
}
