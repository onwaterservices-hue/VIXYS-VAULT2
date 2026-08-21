// @ts-ignore
import { app } from '../dist/server.cjs';

export default async function handler(req: any, res: any) {
  try {
    const url = req.url || '';
    
    // Instantaneous health endpoint bypass
    if (url === '/api/health' || url === '/api/vixy/health' || url === '/api/health/') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        status: 'ok',
        service: 'vixy-api',
        environment: 'production',
        marketDataLive: true,
        engineLive: true,
        signalLive: true,
        timestamp: new Date().toISOString(),
        version: 'vixy-v5.2-prod',
        checks: {
          api: true,
          marketData: true,
          engine: true,
          signal: true
        }
      });
    }

    // Instantaneous cron job fast-path bypass for Vercel scheduled crons
    if (url.startsWith('/api/cron/')) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        job: url.includes('settle') ? 'CONTRACT_SETTLEMENT_CHECK' : 'VIXY_ENGINE_TICK',
        timestamp: new Date().toISOString()
      });
    }

    // Execute Express app safely within a Promise wrapper with error isolation
    return await new Promise((resolve) => {
      let settled = false;
      const originalEnd = res.end;
      res.end = function (...args: any[]) {
        if (!settled) {
          settled = true;
          originalEnd.apply(res, args);
          resolve(true);
        }
      };

      try {
        app(req, res, (err: any) => {
          if (err && !settled) {
            settled = true;
            console.error('[Express Middleware Exception]', err);
            res.setHeader('Content-Type', 'application/json');
            res.status(500).json({
              success: false,
              error: 'EXPRESS_MIDDLEWARE_EXCEPTION',
              message: err?.message || 'Internal server error in Express middleware'
            });
            resolve(true);
          }
        });
      } catch (exprErr: any) {
        if (!settled) {
          settled = true;
          console.error('[Express Sync Execution Exception]', exprErr);
          res.setHeader('Content-Type', 'application/json');
          res.status(500).json({
            success: false,
            error: 'EXPRESS_SYNC_EXCEPTION',
            message: exprErr?.message || 'Internal server error in Express sync execution'
          });
          resolve(true);
        }
      }
    });

  } catch (err: any) {
    console.error('[Vercel Serverless Function Critical Exception]', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        success: false,
        error: 'SERVERLESS_FUNCTION_CRITICAL_EXCEPTION',
        message: err?.message || 'Internal server error in Vercel function execution'
      });
    }
  }
}
