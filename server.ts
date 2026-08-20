import express from 'express';
import './dist/server.cjs';

// This file is required by AI Studio to detect a Full-Stack Express application.
// The actual Express app is bundled by esbuild into dist/server.cjs and started there.
const app = express();
// app.listen(3000);
