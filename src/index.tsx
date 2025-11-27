// エントリーポイント
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { mainRoutes, manageRoutes, hunkRoutes, apiRoutes } from "./routes";

const app = new Hono();

// 静的ファイル配信
app.use("/styles.css", serveStatic({ path: "./public/styles.css" }));

// ルートをマウント
app.route("/", mainRoutes);
app.route("/", manageRoutes);
app.route("/", hunkRoutes);
app.route("/", apiRoutes);

const port = parseInt(process.env.PORT || "3000");
console.log(`
🌳 Worktree Diff Viewer
   http://localhost:${port}

   Usage: Open the URL and enter your repository path.
`);

export default {
  port,
  fetch: app.fetch,
};
