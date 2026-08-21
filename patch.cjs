const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

const target = `}else{console.log("[Vercel] Serverless function initialized successfully.")}}`;
const replacement = `}
if (process.env.NODE_ENV !== "production") {
    import("vite").then(vite => {
        vite.createServer({
            server: { middlewareMode: true },
            appType: "spa"
        }).then(viteServer => {
            app.use(viteServer.middlewares);
        });
    });
} else {
    import("path").then(path => {
        import("express").then(express => {
            app.use(express.default.static(path.default.join(process.cwd(), "dist")));
            app.get("*", (req, res) => {
                res.sendFile(path.default.join(process.cwd(), "dist/index.html"));
            });
        });
    });
}
}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('backend.ts', content, 'utf8');
    console.log("Patched successfully");
} else {
    console.log("Target not found");
}
