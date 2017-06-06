/** @babel */

import fs from 'fs';
import * as utils from '../lib/utils';

describe('Utils', () => {
  describe('findRepo', () => {
    it('should find the git repo', () => {
      spyOn(fs, 'existsSync').andCallFake(path => path === '/fakeRoot/.git');
      const repoPath = utils.findRepo('/fakeRoot/lib/utils/');
      expect(repoPath).toEqual('/fakeRoot/.git');
    });
  });

  describe('getCommitLink', () => {
    beforeEach(() => {
      spyOn(utils, 'findRepo').andReturn('/.git');
    });

    it('should provide a correct link for github', async () => {
      spyOn(utils.git, 'getConfig').andReturn('https://github.com/baldurh/atom-status-bar-blame.git');
      const link = await utils.getCommitLink('somefile.txt', '12345678');
      expect(link).toEqual('https://github.com/baldurh/atom-status-bar-blame/commit/12345678');
    });

    it('should provide a correct link', async () => {
      spyOn(utils.git, 'getConfig').andReturn('git@gitlab.hidden.dom:eid/broncode.git');
      const link = await utils.getCommitLink('somefile.txt', '12345678');
      expect(link).toEqual('http://gitlab.hidden.dom/eid/broncode/commit/12345678');
    });
  });

  describe('getCommit', () => {
    beforeEach(() => {
      spyOn(utils, 'findRepo').andReturn('/.git');
    });

    it('should return null', async () => {
      spyOn(utils.git, 'show').andReturn(null);
      const commit = await utils.getCommit('somefile.txt', '11111111');
      expect(commit).toBe(null);
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
      expect(utils.isCommitted('12345678')).toBe(true);
    });

    it('should return false', () => {
      expect(utils.isCommitted('00000000')).toBe(false);
    });
  });
});
