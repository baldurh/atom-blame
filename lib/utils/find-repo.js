/** @babel */

import path from 'path';
import fs from 'fs';

const cache = {};
const gitPaths = [];

export default function findRepo(basePath) {
  // Check cache
  if (cache[basePath]) {
    return cache[basePath];
  }
  // Check whether we have found a path before that matches
  const gitPath = gitPaths.find(p => basePath.indexOf(p) !== -1);
  if (gitPath) {
    const repoPath = path.join(gitPath, '.git');
    cache[basePath] = repoPath;
    return repoPath;
  }
  let lastPath;
  let currentPath = basePath;
  while (currentPath && lastPath !== currentPath) {
    lastPath = currentPath;
    currentPath = path.dirname(currentPath);

    const repoPath = path.join(currentPath, '.git');

    if (fs.existsSync(repoPath)) {
      cache[basePath] = repoPath;
      gitPaths.push(currentPath);
      return repoPath;
    }
  }

  return null;
}
