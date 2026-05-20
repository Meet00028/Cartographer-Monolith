import { openDB } from 'idb';

const DB_NAME = 'cartographer_db';
const STORE_NAME = 'sessions';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

export const saveSession = async (data) => {
  const db = await initDB();
  await db.put(STORE_NAME, data, 'last_session');
};

export const loadSession = async () => {
  const db = await initDB();
  return db.get(STORE_NAME, 'last_session');
};

export const clearSession = async () => {
  const db = await initDB();
  await db.delete(STORE_NAME, 'last_session');
};
