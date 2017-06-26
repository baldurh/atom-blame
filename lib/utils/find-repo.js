/** @babel */
import { Directory } from 'atom';

const cache = {};

export default async function repositoryForPath(goalPath) {
  if (cache[goalPath]) {
    return cache[goalPath];
  }
  try {
    const repo = await atom.project.repositoryForDirectory(new Directory(goalPath));
    if (repo) {
      cache[goalPath] = repo;
      return repo;
    }
  } catch (e) {
    // Nothing to do. Just go to the fallback code.
  }

  const dirs = atom.project.getDirectories();
  for (let i = 0; i < dirs.length; i += 1) {
    const directory = dirs[i];
    if (goalPath === directory.getPath() || directory.contains(goalPath)) {
      const repo = atom.project.repositoryForDirectory(directory);
      cache[goalPath] = repo;
      return repo;
    }
  }
  return null;
}
