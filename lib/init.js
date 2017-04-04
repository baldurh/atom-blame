/** @babel */

import BlameStatusBarView from './blame-status-bar-view';

let blameView;

export default {
  config: {
    dateFormat: {
      title: 'Format (date)',
      description: [
        'Placeholders: `YYYY` (year), `MM` (month), `DD` (day), `HH` (hours), `mm` (minutes).',
        'See [momentjs documentation](http://momentjs.com/docs/#/parsing/string-format/) for mor information.',
      ].join('<br>'),
      type: 'string',
      default: 'YYYY-MM-DD',
    },
  },

  activate() {
    blameView = new BlameStatusBarView();
  },

  deactivate() {
    if (blameView) { blameView.dispose(); }
  },

  consumeStatusBar(statusBar) {
    blameView.init();
    statusBar.addLeftTile({ priority: 100, item: blameView });
  },
};
