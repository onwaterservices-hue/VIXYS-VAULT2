const fs = require('fs');

function scanFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    let nonAsciiCount = 0;
    
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        if (byte < 9 || (byte > 13 && byte < 32) || byte > 126) {
            nonAsciiCount++;
        }
    }
    console.log(`File: ${filePath} | Non-ASCII/non-printable bytes: ${nonAsciiCount}`);
}

scanFile('server.ts');
scanFile('src/services/persistentStoreLoaders.ts');
