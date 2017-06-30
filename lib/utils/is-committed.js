/** @babel */

export default function isCommitted(hash) {
  return !!hash && !/^[0]+$/.test(hash);
}
