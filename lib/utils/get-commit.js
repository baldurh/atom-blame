/** @babel */

import { show } from './git';

const cache = {};
const promiseCache = {};

function getCache(file, hash) {
  return cache[`${file}|${hash}`] || null;
}

function setCache(file, hash, msg) {
  cache[`${file}|${hash}`] = msg;
}

function getPromiseCache(file, hash) {
  return promiseCache[`${file}|${hash}`] || null;
}

function setPromiseCache(file, hash, promise) {
  promiseCache[`${file}|${hash}`] = promise;
}

function getCommitMessage(file, hash) {
  const cached = getPromiseCache(file, hash);
  if (cached) { return cached; }

  const promise = show(file, hash);

  setPromiseCache(file, hash, promise);
  return promise;
}

export default async function getCommit(file, hash) {
  const cached = getCache(file, hash);
  if (cached) { return cached; }

  const msg = await getCommitMessage(file, hash);
  if (!msg) { return null; }

  const lines = msg.split(/\n/g);

  const commit = {
    email: lines.shift(),
    author: lines.shift(),
    subject: lines.shift(),
    message: lines.join('\n').replace(/(^\s+|\s+$)/, ''),
  };

  setCache(file, hash, commit);

  return commit;
}
