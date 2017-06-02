/** @babel */

import { blame } from './git';

function convertStringToObject(line) {
  const commit = {};
  const matches = line.match(/(.+)\s+\((.+)\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (\+|-)\d{4})\s+(\d+)\)(.*)/);
  commit.rev = matches[1];
  commit.author = matches[2].trim();
  commit.date = matches[3];
  commit.line = matches[5];

  return commit;
}

export default async function (file) {
  const msg = await blame(file);
  if (!msg) {
    return null;
  }
  const lines = msg.split('\n').filter(l => !!l).map(convertStringToObject);
  return lines;
}
