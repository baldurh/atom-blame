/** @babel */

export default function isCommitted(hash) {
  return !/^[0]+$/.test(hash);
}
