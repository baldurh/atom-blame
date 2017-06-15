/** @babel */

import configs from '../config/provider';

function parseRemote(remote, config) {
  for (const exp of config.exps) { // eslint-disable-line
    const m = remote.match(exp);
    if (m) {
      return { protocol: m[1], host: m[2], user: m[3], repo: m[4] };
    }
  }
  return null;
}

function buildLink(remote, hash, config) {
  const data = parseRemote(remote, config);
  if (data) {
    return config.template
      .replace('{protocol}', data.protocol || 'http')
      .replace('{host}', data.host)
      .replace('{user}', data.user)
      .replace('{repo}', data.repo)
      .replace('{hash}', hash);
  }
  return null;
}

export default function getCommitLink(file, hash, remote) {
  const cleanRemote = remote.replace(/(^\s+|\s+$)/g, '');

  for (const config of configs) { // eslint-disable-line
    const link = buildLink(cleanRemote, hash, config);
    if (link) {
      return link;
    }
  }

  return null;
}
