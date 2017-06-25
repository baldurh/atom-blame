/** @babel */
import { CompositeDisposable } from 'atom';
import open from 'open';
import moment from 'moment';
import gravatar from 'gravatar';
import { findRepo, blameFile, isCommitted, getCommit, getCommitLink } from './utils';

function formatLine(hash, line) {
  const dateFormat = atom.config.get('status-bar-blame.dateFormat');
  const date = moment(line.date, 'YYYY-MM-DD HH:mm:ss');
  let dateStr;
  if (date.isBefore(moment().subtract(5, 'days'))) {
    dateStr = date.format(dateFormat);
  } else {
    dateStr = date.fromNow();
  }

  if (isCommitted(hash)) {
    return `<a href="#"><span class="author">${line.author}</span> · <span class="date">${dateStr}</span></a>`;
  }

  return `${line.author}`;
}

export default class EditorHandler {
  constructor(editor, blameView) {
    blameView.clear();
    this.editor = editor;
    this.blameView = blameView;
    this.subscriptions = new CompositeDisposable();

    this.subscribeToRepository();
    this.scheduleUpdate();
    this.subscriptions.add(atom.project.onDidChangePaths(this.subscribeToRepository.bind(this)));
    this.subscriptions.add(
      atom.workspace.onDidStopChangingActivePaneItem(this.paneItemChanged.bind(this)),
    );

    this.subscriptions.add(this.editor.onDidStopChanging(this.onDidStopChanging.bind(this)));
    this.subscriptions.add(this.editor.onDidChangePath(this.updateAllDataAndRender.bind(this)));
    this.subscriptions.add(
      this.editor.onDidChangeCursorPosition(this.cursorPositionChanged.bind(this)),
    );

    this.subscriptions.add(this.editor.onDidDestroy(() => {
      this.cancelUpdate();
      this.subscriptions.dispose();
      this.subscriptions = null;
      this.editor = null;
      this.blameView = null;
    }));
  }

  get path() {
    return this.editor.getPath();
  }

  /**
   * Event Handlers
   */

  subscribeToRepository() {
    this.repository = findRepo(this.path);
    if (this.repository) {
      this.subscriptions.add(this.repository.onDidChangeStatuses(this.scheduleUpdate.bind(this)));
      this.subscriptions.add(this.repository.onDidChangeStatus((path) => {
        if (path === this.path) {
          this.scheduleUpdate();
        }
      }));
    } else {
      this.blameView.clear();
    }
  }

  async onDidStopChanging({ changes }) {
    if (this.editor.isDestroyed() || !this.repository || changes.length === 0) { return; }
    this.updateDiffs();
    this.checkAndRender();
  }

  async updateAllDataAndRender() {
    if (this.editor.isDestroyed() || !this.repository) { return; }
    this.updateDiffs();
    this.blameData = await this.getBlameData(this.editor);
    this.messages = await this.getAllMessages(this.blameData);
    this.checkAndRender();
  }

  scheduleUpdate() {
    this.cancelUpdate();
    this.updateId = setImmediate(this.updateAllDataAndRender.bind(this));
  }

  cursorPositionChanged({ row, newBufferPosition = {} }, force = false) {
    const r = newBufferPosition.row !== undefined ? newBufferPosition.row : row;
    if (force || !this.lastRow || this.lastRow !== r) {
      this.hash = null;
      this.render(r);
      this.lastRow = r;
    }
  }

  paneItemChanged(item) {
    if (item === this.editor) {
      this.cursorPositionChanged(this.editor.getCursorBufferPosition(), true);
    }
  }

  /**
   * Render Methods
   */

  checkAndRender() {
    if (this.editor === atom.workspace.getActiveTextEditor()) {
      this.cursorPositionChanged(this.editor.getCursorBufferPosition(), true);
    }
  }

  render(row) {
    if (!this.blameData || !this.messages || this.diffs[row]) {
      this.blameView.notCommitted();
      return;
    }

    this.blameView.editorHandler = this;
    this.blameView.render(this.blameData[row]);
    this.blameView.registerTooltip(this.messages[row]);
  }

  /**
   * Data Methods
   */

  updateDiffs() {
    const path = this.editor.getPath();
    if (path) {
      this.diffs = [];
      const diffs = this.repository.getLineDiffs(path, this.editor.getText());
      if (!diffs) { return; }
      for (let i = 0; i < diffs.length; i += 1) {
        const ref = diffs[i];
        const newStart = ref.newStart;
        const newLines = ref.newLines;
        const startRow = newStart - 1;
        const endRow = newStart + (newLines - 1);

        for (let j = startRow; j < endRow; j += 1) {
          this.diffs[j] = true;
        }
      }
    }
  }

  async getBlameData() {
    if (!this.repository || !this.editor || !this.path) { return null; }

    const result = await blameFile(this.path);
    if (!result) { return null; }

    return result.map((line) => {
      const hash = line.rev.replace(/\s.*/, '');
      const lineStr = formatLine(hash, line);
      return {
        html: lineStr,
        hash,
      };
    });
  }

  getAllMessages(data) {
    if (!data) {
      return null;
    }
    return Promise.all(data.map(({ hash }, i) => {
      if (this.diffs[i]) {
        return null;
      }
      if (isCommitted(hash)) {
        return this.getTooltipContent(hash);
      }
      return null;
    }));
  }

  async getTooltipContent(hash) {
    if (!this.editor) {
      return null;
    }
    const msg = await getCommit(this.path, hash.replace(/^[\^]/, ''));
    msg.avatar = gravatar.url(msg.email, { s: 80 });
    return msg;
  }

  /**
   * Other Methods
   */


  openCommitInBrowser() {
    const { data } = this.getRowData();
    const link = getCommitLink(this.path, data.hash, this.repository.getOriginURL());
    if (link) {
      open(link);
    } else {
      this.blameView.addNotificationTooltip('Unknown url. Shift-click to copy hash.', 2000);
    }
  }

  async copyCommitHash() {
    const { data, message } = this.getRowData();
    const shortHash = data.hash.replace(/^[\^]/, '').substring(0, 8);
    atom.clipboard.write(shortHash);
    await this.blameView.registerCopiedTooltip(shortHash);
    this.blameView.registerTooltip(message);
  }

  getRowData() {
    if (!this.blameData) {
      return null;
    }
    const { row } = this.editor.getCursorBufferPosition();
    return {
      data: this.blameData[row],
      message: this.messages[row],
    };
  }

  cancelUpdate() {
    clearImmediate(this.updateId);
  }
}
