import { rm, stat } from "node:fs/promises";
import type { ServeOptions } from "bun";
import * as path from "path";

import cosmosConfig from "./cosmos.config.json";

const PROJECT_ROOT = import.meta.dir;
const BUILD_DIR = path.resolve(PROJECT_ROOT, "build");

const waitForCosmosImports = async () => {
  const fpath = `${PROJECT_ROOT}/cosmos.imports.ts`;
  try {
    const cosmosImports = await stat(fpath);
    if (!cosmosImports.isFile()) {
      throw new Error(`
        file doesnt exist yet
      `);
    }
  } catch {
    return new Promise((resolve) => {
      setTimeout(() => resolve(waitForCosmosImports()), 1000);
    });
  }
};

const buildApp = async () =>
  rm(BUILD_DIR, { force: true, recursive: true }).then(() =>
    Bun.build({
      entrypoints: ["./cosmos.entrypoint.tsx"],
      target: "browser",
      outdir: "build",
    }).then((output) => output)
  );

await waitForCosmosImports().then(
  () =>
    buildApp()
      .then(({ success, outputs, logs, ...buildData }) => {
        if (success) console.info(`app built ${outputs.length} files `);
        else for (const message of logs) console.error(message);
      })
      .then(() => import("./cosmos.imports.ts").catch((e) => e)) // watch imports
);

const returnIndex = () => {
  const index = `
    <!DOCTYPE html>
    <html lang="en">
    <body>
      <script src="${BUILD_DIR}/cosmos.entrypoint.js" type="module">
      </script>
    </body>
    </html>
  `;

  return new Response(index, {
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

const serveFromDir = async (config: {
  directory?: string;
  path: string;
}): Promise<Response | null> => {
  const filepath = path.join(config.directory || "", config.path);

  try {
    const fd = await stat(filepath);
    if (fd && fd.isFile()) {
      return new Response(Bun.file(filepath), {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  } catch (err) {}

  return null;
};

export default {
  port: cosmosConfig.rendererUrl.split(":").pop(),
  hostname: "0.0.0.0",
  async fetch(req) {
    const reqPath = new URL(req.url).pathname;
    console.log(req.method, reqPath);

    if (reqPath === "/") return returnIndex();
    else {
      const filepath = req.url.replace(cosmosConfig.rendererUrl, "");

      return (
        (await serveFromDir({ path: filepath })) ||
        (await serveFromDir({
          directory: BUILD_DIR,
          path: filepath,
        })) ||
        new Response("File not found", {
          status: 404,
        })
      );
    }
  },
} satisfies ServeOptions;
