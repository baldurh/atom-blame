/** @babel */

import { blame } from './git';

function convertStringToObject(string) {
  const matches = string.match(/(.+)\s+\((.+)\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (\+|-)\d{4})\s+(\d+)\)(.*)/);
  const [, rev, author, date, line] = matches;

  return {
    rev, author: author.trim(), date, line,
  };
}

export default async function (file) {
  const msg = await blame(file);
  if (!msg) {
    return null;
  }
  const lines = msg.split('\n').filter(l => !!l).map(convertStringToObject);
  return lines;
}
