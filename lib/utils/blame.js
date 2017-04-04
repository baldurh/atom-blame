/** @babel */

import Blamer from 'blamer';

let blamer = null;

export default async function (file) {
  if (!blamer) {
    blamer = new Blamer('git');
  }
  try {
    const result = await blamer.blameByFile(file);
    return result[file];
  } catch (e) {
    return null;
  }
}
