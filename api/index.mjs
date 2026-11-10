import { ipAddress } from '@vercel/functions';
import { makeGameApi } from '../server/game-api.mjs';
import { blobRooms } from '../server/blob-rooms.mjs';

// Do not connect to the suspended Neon project; new rooms use private Vercel Blob.
const api = makeGameApi({ store: blobRooms(), requireRoomPassword: true });

export default {
  fetch(request) {
    const url = new URL(request.url);
    const path = url.searchParams.get('__game_path');
    const pathname = url.pathname === '/api/index' && path ? `/api/${path}` : url.pathname;
    return api(request, { pathname, address: ipAddress(request) });
  },
};
