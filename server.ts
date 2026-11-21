import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createBackendApp } from './backend/app.ts';
import { env } from './backend/config/env.ts';

async function startServer() {
  const app = createBackendApp();

  if (env.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`[SOVRAN] Storefront server (Firebase Firestore) listening on http://localhost:${env.port}`);
  });
}

startServer().catch((err) => {
  console.error('[SOVRAN] Failed to start server:', err);
  process.exit(1);
});
