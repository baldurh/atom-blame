/** @babel */

import { CompositeDisposable } from 'atom';
import BlameStatusBarView from './blame-status-bar-view';
import EditorHandler from './editor-handler';

let blameView;
let subscriptions;

export default {
  config: {
    dateFormat: {
      title: 'Format (date)',
      description: [
        'Placeholders: `YYYY` (year), `MM` (month), `DD` (day), `HH` (hours), `mm` (minutes).',
        'See [momentjs documentation](http://momentjs.com/docs/#/parsing/string-format/) for more information.',
      ].join('<br>'),
      type: 'string',
      default: 'YYYY-MM-DD',
    },
  },

  activate() {
    blameView = new BlameStatusBarView();
    subscriptions = new CompositeDisposable();
    subscriptions.add(atom.workspace.observeTextEditors((editor) => {
      new EditorHandler(editor, blameView); // eslint-disable-line
    }));
    subscriptions.add(atom.workspace.onDidChangeActivePaneItem((item) => {
      if (!item || item.constructor.name !== 'TextEditor') {
        blameView.clear();
      }
    }));
  },

  deactivate() {
    if (blameView) {
      blameView.dispose();
      blameView = null;
    }
    if (subscriptions) {
      subscriptions.dispose();
      subscriptions = null;
    }
  },

  consumeStatusBar(statusBar) {
    blameView.init();
    statusBar.addLeftTile({ priority: 100, item: blameView });
  },
};
