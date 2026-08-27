const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const importStr = 'import { loadPersistentStore as loadPersistentStoreExt, loadPersistentStoreAsync as loadPersistentStoreAsyncExt } from "./src/services/persistentStoreLoaders";\n';

if (content.indexOf(importStr) !== -1) {
    content = content.replace(importStr, '');
    content = importStr + content;
    fs.writeFileSync('server.ts', content);
    console.log("Moved import to top");
}
