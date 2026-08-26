const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const badIndex = code.indexOf('https:x');
if (badIndex !== -1) {
  code = code.substring(0, badIndex - 1);
  code += `https://cdn.discordapp.com/avatars/\${docId}/\${data.avatar}.png\`\n`;
  code += `            : null,\n`;
  code += `        };\n`;
  code += `        serverUsers.set(docId, profileObj);\n`;
  code += `      }\n`;
  code += `    });\n`;
  code += `    const profilesSnap = await getDocs(collection(db, "users"));\n`;
  code += `    profilesSnap.forEach((docSnap) => {\n`;
  code += `      processProfileDoc(docSnap.data(), docSnap.id);\n`;
  code += `    });\n`;
  code += `    console.log(\`[Store] Loaded \${fetchedProfilesCount} users from Firestore\`);\n`;
  code += `  } catch (err) {\n`;
  code += `    console.error("[Firestore] Boot sync error:", err);\n`;
  code += `  }\n`;
  code += `}\n`;
  
  // Now add the startServer block
  code += `\nfunction startServer() {
  const port = 3000;
  if (process.env.NODE_ENV !== "production") {
    const vite = require("vite");
    vite.createServer({ server: { middlewareMode: true }, appType: "spa" })
      .then((viteServer) => {
        app.use(viteServer.middlewares);
        app.listen(port, () => console.log(\`Server listening on port \${port}\`));
      });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.listen(port, () => console.log(\`Server listening on port \${port}\`));
  }
}
startServer();
`;
  
  fs.writeFileSync('server.ts', code);
  console.log('Fixed server.ts');
} else {
  console.log('Corruption not found');
}
