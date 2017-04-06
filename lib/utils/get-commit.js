/** @babel */

import Git from 'git-wrapper';
import findRepo from './find-repo';

const showOpts = {
  s: true,
  format: '%ce%n%cn%n%B',
};

const cache = {};

function getCache(file, hash) {
  return cache[`${file}|${hash}`] || null;
}

function setCache(file, hash, msg) {
  cache[`${file}|${hash}`] = msg;
}

function getCommitMessage(file, hash) {
  const repoPath = findRepo(file);

  if (!repoPath) { return null; }

  const git = new Git({ 'git-dir': repoPath });

  return new Promise((resolve, reject) => {
    git.exec('show', showOpts, [hash], (error, msg) => {
      if (error) { reject(error); }
      resolve(msg);
    });
  });
}

async function getCommit(file, hash) {
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


module.exports = getCommit;
