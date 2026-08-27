with open('server.ts', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

out_lines = lines[:14968]
out_lines.append("            console.warn(`[FIRESTORE_CIRCUIT] Hydrated OPEN circuit breaker state from disk cache`);\n")
out_lines.append("          }\n")
out_lines.append("        }\n")
out_lines.append("      }\n")
out_lines.append("    }\n")
out_lines.append("  } catch (err) {\n")
out_lines.append("    console.error('[Firestore] Boot sync error:', err);\n")
out_lines.append("  }\n")
out_lines.append("}\n\n")

out_lines.append("""
async function startServer() {
  const port = 3000;
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const viteServer = await createServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(viteServer.middlewares);
  } else {
    const path = await import("path");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
  });
}

if (!process.env.VERCEL && !process.env.NOW_REGION) {
  startServer();
}

export { app, startServer };
export default app;
""")

with open('server.ts', 'w', encoding='utf-8') as f:
    f.writelines(out_lines)
