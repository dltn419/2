import { attachDatabasePool, ipAddress } from '@vercel/functions';
import pg from 'pg';
import { makeGameApi } from '../server/game-api.mjs';
import { postgresRooms } from '../server/postgres-rooms.mjs';

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new pg.Pool({
  connectionString: databaseUrl,
  max: 8,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 4500,
  statement_timeout: 7000,
  enableChannelBinding: true,
}) : null;
if (pool) {
  pool.on('error', (error) => console.error('100nyeon idle database connection failed', error.code ?? error.name));
  attachDatabasePool(pool);
}
const api = makeGameApi({ store: pool && postgresRooms(pool), hostPin: process.env.HOST_PIN, requirePin: true });

export default {
  fetch(request) {
    const url = new URL(request.url);
    const path = url.searchParams.get('__game_path');
    const pathname = url.pathname === '/api/index' && path ? `/api/${path}` : url.pathname;
    return api(request, { pathname, address: ipAddress(request) });
  },
};
