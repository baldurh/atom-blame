/** @babel */

import { spawn } from 'child_process';
import path from 'path';

function exec(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd });
    let stdout = '';
    let stderr = '';
    let processError;
    child.stdout.on('data', data => (stdout += data));

    child.stderr.on('data', data => (stderr += data));

    child.on('error', error => (processError = error));

    child.on('close', (errorCode) => {
      if (processError) {
        return reject(processError);
      }

      if (errorCode) {
        const error = new Error(stderr);
        error.code = errorCode;
        return reject(error);
      }

      return resolve(stdout.trimRight());
    });
  });
}

export async function blame(file) {
  const fileName = path.basename(file);
  const cwd = path.dirname(file);
  try {
    return await exec(['blame', fileName], cwd);
  } catch (e) {
    return null;
  }
}

export function show(file, hash) {
  const cwd = path.dirname(file);
  try {
    return exec(['show', '-s', '--format=%ae%n%an%n%B', hash], cwd);
  } catch (e) {
    return null;
  }
}

export function getConfig(key, repo) {
  try {
    return exec([`--git-dir=${repo}`, 'config', '--get', key]);
  } catch (e) {
    return null;
  }
}
