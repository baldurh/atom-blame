/** @babel */
import moment from 'moment';
import fs from 'fs-plus';
import temp from 'temp';
import path from 'path';
import * as utils from '../lib/utils';
import BlameView from '../lib/blame-status-bar-view';
import EditorHandler from '../lib/editor-handler';

const COMMIT_MESSAGE = '<a href="#"><span class="author">Baldur Helgason</span> · <span class="date">2016-06-16</span></a>';

describe('Status Bar Blame', () => {
  let projectPath;
  let workspaceElement;
  const blameEl = () => workspaceElement.querySelector('status-bar-blame');

  beforeEach(() => {
    jasmine.useRealClock();
    workspaceElement = atom.views.getView(atom.workspace);
    spyOn(window, 'setImmediate').andCallFake(fn => fn());

    projectPath = temp.mkdirSync('status-bar-blame');

    fs.copySync(path.join(__dirname, 'fixtures', 'working-dir'), projectPath);
    fs.moveSync(path.join(projectPath, 'git'), path.join(projectPath, '.git'));
    atom.project.setPaths([projectPath]);
    waitsForPromise(() => atom.packages.activatePackage('status-bar'));
    waitsForPromise(() => atom.packages.activatePackage('status-bar-blame'));
  });

  describe('Status bar without git repo', () => {
    it('renders nothing', () => {
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
      renderSpy = spyOn(EditorHandler.prototype, 'render').andCallThrough();
    });

    it('renders blame element', () => {
      waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
      runs(() => {
        expect(blameEl()).toExist();
      });
    });

    describe('when there’s no data for file', () => {
      it('renders "Not Committed Yet"', () => {
        waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'newFile.js')));
        waitsFor(() => renderSpy.callCount > 0);
        runs(() => {
          expect(blameEl().innerHTML).toEqual('Not Committed Yet');
        });
      });
    });

    describe('when a line has been committed', () => {
      it('renders author name and date', () => {
        spyOn(EditorHandler.prototype, 'getTooltipContent').andReturn();
        waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
        waitsFor(() => renderSpy.callCount > 0);
        runs(() => {
          expect(blameEl().innerHTML).toEqual(COMMIT_MESSAGE);
        });
      });
    });

    describe('when a line was recently committed', () => {
      it('renders author name and relative date (2 days ago)', () => {
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
    });

    describe('when file is modified', () => {
      let editor;

      beforeEach(() => {
        waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
        runs(() => {
          editor = atom.workspace.getActiveTextEditor();
        });
      });

      describe('when a line is added', () => {
        it('renders "Unsaved"', () => {
          waitsFor(() => renderSpy.callCount > 0);

          runs(() => {
            expect(blameEl().innerHTML).toEqual(COMMIT_MESSAGE);
          });

          runs(() => {
            editor.moveToEndOfLine();
            editor.insertNewline();
            editor.insertText('a');
            advanceClock(editor.getBuffer().stoppedChangingDelay);
          });

          waitsFor(() => renderSpy.callCount > 1);

          runs(() => {
            expect(blameEl().innerHTML).toEqual('Unsaved');
          });
        });
      });

      describe('when a line is modified', () => {
        it('renders "Unsaved"', () => {
          waitsFor(() => renderSpy.callCount > 0);

          runs(() => {
            expect(blameEl().innerHTML).toEqual(COMMIT_MESSAGE);
          });

          runs(() => {
            editor.insertText('a');
            advanceClock(editor.getBuffer().stoppedChangingDelay);
          });

          waitsFor(() => renderSpy.callCount > 1);

          runs(() => {
            expect(blameEl().innerHTML).toEqual('Unsaved');
          });
        });
      });

      describe('when a modified line is restored to the HEAD version contents', () => {
        it('renders the commit information', () => {
          waitsFor(() => renderSpy.callCount > 0);

          runs(() => {
            expect(blameEl().innerHTML).toEqual(COMMIT_MESSAGE);
          });

          runs(() => {
            editor.insertText('a');
            advanceClock(editor.getBuffer().stoppedChangingDelay);
          });

          waitsFor(() => renderSpy.callCount > 1);

          runs(() => {
            expect(blameEl().innerHTML).toEqual('Unsaved');
          });

          runs(() => {
            editor.backspace();
            advanceClock(editor.getBuffer().stoppedChangingDelay);
          });

          waitsFor(() => renderSpy.callCount > 2);

          runs(() => {
            expect(blameEl().innerHTML).toEqual(COMMIT_MESSAGE);
          });
        });
      });
    });

    describe('mouse events', () => {
      describe('when element is clicked', () => {
        describe('when url is known', () => {
          it('opens the url', () => {
            spyOn(utils, 'getCommitLink').andReturn('http://foo.bar');
            const openSpy = spyOn(utils, 'open').andReturn();
            waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
            waitsFor(() => renderSpy.callCount > 0);

            runs(() => {
              const event = new Event('click');
              blameEl().dispatchEvent(event);
            });

            waitsFor(() => openSpy.callCount > 0);

            runs(() => {
              expect(openSpy).toHaveBeenCalledWith('http://foo.bar');
            });
          });
        });

        describe('when url is unknown', () => {
          it('displays notification tooltip', () => {
            spyOn(utils, 'getCommitLink').andReturn(null);

            waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
            waitsFor(() => renderSpy.callCount > 0);

            let spy;
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

      describe('when element is shift-clicked', () => {
        it('copies the commit hash', () => {
          spyOn(atom.clipboard, 'write');

          waitsForPromise(() => atom.workspace.open(path.join(projectPath, 'sample.js')));
          waitsFor(() => renderSpy.callCount > 0);

          let spy;
          runs(() => {
            spy = spyOn(EditorHandler.prototype, 'copyCommitHash').andCallThrough();

            const event = new Event('click');
            event.shiftKey = true;
            blameEl().dispatchEvent(event);
          });

          waitsFor(() => spy.callCount > 0);

          runs(() => {
            expect(atom.clipboard.write).toHaveBeenCalledWith('3914687');
          });
        });
      });
    });
  });
});
