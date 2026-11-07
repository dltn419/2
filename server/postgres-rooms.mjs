import { GameError } from '../public/game.mjs';
import { RETENTION, ROOM_LIMIT } from './game-api.mjs';

export function postgresRooms(pool) {
  let initialized;

  async function transaction(work) {
    const client = await pool.connect();
    let discard = false;
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        discard = true;
      }
      throw error;
    } finally {
      client.release(discard);
    }
  }

  function initialize() {
    initialized ??= transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(1002026, 1)');
      await client.query(`CREATE TABLE IF NOT EXISTS year100_rooms (
        code text PRIMARY KEY,
        updated_at bigint NOT NULL,
        state jsonb NOT NULL
      )`);
      await client.query('CREATE INDEX IF NOT EXISTS year100_rooms_updated ON year100_rooms (updated_at)');
      await client.query(`CREATE TABLE IF NOT EXISTS year100_rate_limits (
        scope text PRIMARY KEY,
        count integer NOT NULL,
        until_at bigint NOT NULL
      )`);
    }).catch((error) => {
      initialized = undefined;
      throw error;
    });
    return initialized;
  }

  return {
    async check() {
      await initialize();
      await pool.query('SELECT 1');
    },
    async get(code, now) {
      await initialize();
      const { rows } = await pool.query('SELECT state FROM year100_rooms WHERE code = $1 AND updated_at >= $2', [code, now - RETENTION]);
      return rows[0]?.state ?? null;
    },
    async insert(room) {
      await initialize();
      return transaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(1002026, 2)');
        await client.query('DELETE FROM year100_rooms WHERE updated_at < $1', [room.updated - RETENTION]);
        await client.query('DELETE FROM year100_rate_limits WHERE until_at <= $1', [room.updated]);
        const { rows } = await client.query('SELECT count(*)::integer AS count FROM year100_rooms');
        if (rows[0].count >= ROOM_LIMIT) throw new GameError('지금은 새 방을 만들 수 없어요. 잠시 후 다시 시도해 주세요.', 503);
        const result = await client.query(
          'INSERT INTO year100_rooms (code, updated_at, state) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [room.code, room.updated, room],
        );
        return result.rowCount === 1;
      });
    },
    async edit(code, now, change) {
      await initialize();
      return transaction(async (client) => {
        const { rows } = await client.query(
          'SELECT state FROM year100_rooms WHERE code = $1 AND updated_at >= $2 FOR UPDATE',
          [code, now - RETENTION],
        );
        const room = rows[0]?.state;
        if (!room) return null;
        const before = room.revision;
        const result = change(room);
        if (room.revision !== before) {
          await client.query('UPDATE year100_rooms SET updated_at = $2, state = $3 WHERE code = $1', [code, room.updated, room]);
        }
        return result;
      });
    },
    async allow(scope, now, maximum) {
      await initialize();
      const { rows } = await pool.query(`
        INSERT INTO year100_rate_limits AS current (scope, count, until_at)
        VALUES ($1, 1, $2)
        ON CONFLICT (scope) DO UPDATE SET
          count = CASE WHEN current.until_at <= $3 THEN 1 ELSE current.count + 1 END,
          until_at = CASE WHEN current.until_at <= $3 THEN $2 ELSE current.until_at END
        RETURNING count <= $4 AS allowed`, [scope, now + 60_000, now, maximum]);
      return rows[0].allowed;
    },
  };
}
