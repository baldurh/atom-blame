/** @babel */
import moment from 'moment';
import fs from 'fs-plus';
import temp from 'temp';
import path from 'path';
import * as utils from '../lib/utils';
import BlameView from '../lib/blame-status-bar-view';
import EditorHandler from '../lib/editor-handler';

describe('Status Bar Blame', () => {
  let projectPath;
  let workspaceElement;
  const blameEl = () => workspaceElement.querySelector('status-bar-blame');

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    spyOn(window, 'setImmediate').andCallFake(fn => fn());

    projectPath = temp.mkdirSync('status-bar-blame');

    fs.copySync(path.join(__dirname, 'fixtures', 'working-dir'), projectPath);
    fs.moveSync(path.join(projectPath, 'git.git'), path.join(projectPath, '.git'));
    atom.project.setPaths([projectPath]);
    waitsForPromise(() => atom.packages.activatePackage('status-bar'));
    waitsForPromise(() => atom.packages.activatePackage('status-bar-blame'));
  });

  describe('Status bar without repo', () => {
    it('should not render anything when there’s no git repo', () => {
      const repoSpy = spyOn(EditorHandler.prototype, 'subscribeToRepository').andCallThrough();
      spyOn(utils, 'findRepo').andReturn(null);
      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
      waitsFor(() => repoSpy.callCount > 0);
      runs(() => {
        expect(blameEl().innerHTML).toEqual('');
      });
    });
  });

  describe('Status bar', () => {
    let renderSpy;
    beforeEach(() => {
      renderSpy = spyOn(EditorHandler.prototype, 'checkAndRender').andCallThrough();
    });

    it('should render blame element', () => {
      spyOn(utils, 'findRepo').andReturn(null);
      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
      runs(() => {
        expect(blameEl()).toExist();
      });
    });

    it('should render "Not Committed Yet" when there’s no data for file', () => {
      spyOn(utils, 'blameFile').andReturn(null);
      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
      waitsFor(() => renderSpy.callCount > 0);
      runs(() => {
        expect(blameEl().innerHTML).toEqual('Not Committed Yet');
      });
    });

    it('should render "Not committed yet" when the line hasn’t been committed', () => {
      spyOn(utils, 'blameFile').andReturn([{
        author: 'Not Committed Yet',
        date: '2017-04-03 17:05:39 +0000',
        line: '1',
        rev: '00000000',
      }]);
      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
      waitsFor(() => renderSpy.callCount > 0);
      runs(() => {
        expect(blameEl().innerHTML).toEqual('Not Committed Yet');
      });
    });

    it('should render author name and date', () => {
      spyOn(utils, 'blameFile').andReturn([{
        author: 'Baldur Helgason',
        date: '2016-04-04 09:05:39 +0000',
        line: '1',
        rev: '12345678',
      }]);

      spyOn(EditorHandler.prototype, 'getTooltipContent').andReturn();
      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
      waitsFor(() => renderSpy.callCount > 0);
      runs(() => {
        expect(blameEl().innerHTML).toEqual('<a href="#"><span class="author">Baldur Helgason</span> · <span class="date">2016-04-04</span></a>');
      });
    });

    it('should render author name and relative date (2 days ago)', () => {
      spyOn(utils, 'blameFile').andReturn([{
        author: 'Baldur Helgason',
        date: moment().subtract(2, 'days').format('YYYY-MM-DD HH:mm:ss'),
        line: '1',
        rev: '12345678',
      }]);

      spyOn(EditorHandler.prototype, 'getTooltipContent');
      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
      waitsFor(() => renderSpy.callCount > 0);
      runs(() => {
        expect(blameEl().innerHTML).toEqual('<a href="#"><span class="author">Baldur Helgason</span> · <span class="date">2 days ago</span></a>');
      });
    });

    it('should copy the commit hash on shift+click', () => {
      let spy = null;
      spyOn(utils, 'blameFile').andReturn([{
        author: 'Baldur Helgason',
        date: '2017-04-03 17:05:39 +0000',
        line: '1',
        rev: '12345678',
      }]);

      spyOn(atom.clipboard, 'write');
      spyOn(EditorHandler.prototype, 'getTooltipContent');

      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));

      waitsFor(() => renderSpy.callCount > 0);

      runs(() => {
        spy = spyOn(EditorHandler.prototype, 'copyCommitHash').andCallThrough();

        const event = new Event('click');
        event.shiftKey = true;
        blameEl().dispatchEvent(event);
      });

      waitsFor(() => spy.callCount > 0);

      runs(() => {
        expect(atom.clipboard.write).toHaveBeenCalledWith('12345678');
      });
    });

    it('should display notification tooltip when url is unknown', () => {
      let spy = null;
      spyOn(utils, 'blameFile').andReturn([{
        author: 'Baldur Helgason',
        date: '2017-04-03 17:05:39 +0000',
        line: '1',
        rev: '12345678',
      }]);

      spyOn(utils, 'getCommitLink').andReturn(null);

      spyOn(EditorHandler.prototype, 'getTooltipContent');

      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));

      waitsFor(() => renderSpy.callCount > 0);

      runs(() => {
        spy = spyOn(BlameView.prototype, 'addNotificationTooltip').andCallThrough();

        const event = new Event('click');
        blameEl().dispatchEvent(event);
      });

      waitsFor(() => spy.callCount > 0);

      runs(() => {
        expect(spy).toHaveBeenCalledWith('Unknown url. Shift-click to copy hash.', 2000);
      });
    });
  });
});
