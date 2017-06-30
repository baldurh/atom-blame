/** @babel */

import fs from 'fs-plus';
import temp from 'temp';
import path from 'path';
import * as utils from '../lib/utils';

describe('Utils', () => {
  describe('findRepo', () => {
    it('should find the git repo', () => {
      const projectPath = temp.mkdirSync('status-bar-blame');
      fs.copySync(path.join(__dirname, 'fixtures', 'working-dir'), projectPath);
      fs.moveSync(path.join(projectPath, 'git'), path.join(projectPath, '.git'));
      atom.project.setPaths([projectPath]);
      const repo = utils.findRepo(path.join(projectPath, '/some-dir'));
      expect(repo).not.toBeNull();
    });
  });

  describe('getCommitLink', () => {
    it('should provide a correct link for github', async () => {
      const link = await utils.getCommitLink('somefile.txt', '12345678', 'https://github.com/baldurh/atom-status-bar-blame.git');
      expect(link).toEqual('https://github.com/baldurh/atom-status-bar-blame/commit/12345678');
    });

    it('should provide a correct link', async () => {
      const link = await utils.getCommitLink('somefile.txt', '12345678', 'git@gitlab.hidden.dom:eid/broncode.git');
      expect(link).toEqual('http://gitlab.hidden.dom/eid/broncode/commit/12345678');
    });
  });

  describe('getCommit', () => {
    it('should return null', async () => {
      spyOn(utils.git, 'show').andReturn(null);
      const commit = await utils.getCommit('somefile.txt', '11111111');
      expect(commit).toBeNull();
    });

    it('should return a valid commit object', async () => {
      spyOn(utils.git, 'show').andReturn(`someone@wherever.com
Some One
Subject Line

Line 1
Line 2`);
      const commit = await utils.getCommit('somefile.txt', '12345678');
      expect(commit).toEqual({
        email: 'someone@wherever.com',
        author: 'Some One',
        subject: 'Subject Line',
        message: 'Line 1\nLine 2',
      });
    });
  });

  describe('isCommitted', () => {
    it('should return true', () => {
      expect(utils.isCommitted('12345678')).toBeTruthy();
    });

    it('should return false', () => {
      expect(utils.isCommitted('00000000')).toBeFalsy();
    });
  });
});
