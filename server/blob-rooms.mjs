import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { GameError } from '../public/game.mjs';
import { RETENTION } from './game-api.mjs';

// Room data stays private. A fresh store starts every classroom with no old rooms.
const prefix = 'year100-v2/';
const pathFor = (code) => `${prefix}rooms/${code}.json`;
const access = 'private';
const maxRetries = 12;

async function read(pathname) {
  const response = await get(pathname, { access });
  if (!response) return null;
  if (!response.stream || !response.blob?.etag) throw new Error('Invalid room storage response');
  return {
    value: await new Response(response.stream).json(),
    etag: response.blob.etag,
  };
}

function isPrecondition(error) {
  return error instanceof BlobPreconditionFailedError || error?.name === 'BlobPreconditionFailedError';
}

function isAlreadyExists(error) {
  return error?.name === 'BlobAlreadyExistsError' ||
    (error?.status === 409 && /exists|conflict/i.test(error?.message ?? ''));
}

export function blobRooms() {
  // The in-memory limiter is a cheap safeguard only; correctness relies on CAS writes.
  const limits = new Map();

  return {
    async check() {
      if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Room storage token is not configured');
      await get(`${prefix}healthcheck.json`, { access });
    },

    async get(code, now) {
      const found = await read(pathFor(code));
      if (!found || found.value.updated < now - RETENTION) return null;
      return found.value;
    },

    async insert(room) {
      try {
        await put(pathFor(room.code), JSON.stringify(room), {
          access,
          addRandomSuffix: false,
          contentType: 'application/json',
        });
        return true;
      } catch (error) {
        if (isAlreadyExists(error)) return false;
        throw error;
      }
    },

    async edit(code, now, change) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const found = await read(pathFor(code));
        if (!found || found.value.updated < now - RETENTION) return null;
        const room = found.value;
        const previousRevision = room.revision;
        const result = change(room);

        // Read-only requests must not consume a write or overwrite newer state.
        if (room.revision === previousRevision) return result;

        try {
          await put(pathFor(code), JSON.stringify(room), {
            access,
            allowOverwrite: true,
            ifMatch: found.etag,
            addRandomSuffix: false,
            contentType: 'application/json',
          });
          return result;
        } catch (error) {
          if (!isPrecondition(error)) throw error;
          // Another student's choice won the race. Read its state and reapply.
        }
      }
      throw new GameError('여러 명이 동시에 선택했어요. 다시 시도해 주세요.', 409);
    },

    async allow(scope, now, maximum) {
      if (limits.size > 10000) {
        for (const [id, value] of limits) if (value.until <= now) limits.delete(id);
      }
      const previous = limits.get(scope);
      const value = previous && previous.until > now
        ? { count: previous.count + 1, until: previous.until }
        : { count: 1, until: now + 60000 };
      limits.set(scope, value);
      return value.count <= maximum;
    },
  };
}
