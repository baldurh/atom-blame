/** @babel */

import path from 'path';
import fs from 'fs';

function findRepo(basePath) {
  let lastPath;
  let currentPath = basePath;
  while (currentPath && lastPath !== currentPath) {
    lastPath = currentPath;
    currentPath = path.dirname(currentPath);

    const repoPath = path.join(currentPath, '.git');

    if (fs.existsSync(repoPath)) {
      return repoPath;
    }
  }

  return null;
}

module.exports = findRepo;
