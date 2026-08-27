// @ts-ignore
const server = require('../dist/server.cjs');
const app = server.default || server.app || server;

export default function handler(req: any, res: any) {
  return app(req, res);
}

