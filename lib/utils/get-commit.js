/** @babel */

import { show } from './git';

const cache = {};

function getCache(file, hash) {
  return cache[`${file}|${hash}`] || null;
}

function setCache(file, hash, msg) {
  cache[`${file}|${hash}`] = msg;
}

function getCommitMessage(file, hash) {
  return show(file, hash);
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
