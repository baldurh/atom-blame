/** @babel */

export default function repositoryForPath(goalPath) {
  const dirs = atom.project.getDirectories();
  for (let i = 0; i < dirs.length; i += 1) {
    const directory = dirs[i];
    if (goalPath === directory.getPath() || directory.contains(goalPath)) {
      return atom.project.getRepositories()[i];
    }
  }
  return null;
}
