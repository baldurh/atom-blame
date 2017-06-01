/** @babel */

import gravatar from 'gravatar';
import open from 'open';
import moment from 'moment';
import { CompositeDisposable, Disposable } from 'atom';
import utils from './utils';

function formatLine(hash, line) {
  const dateFormat = atom.config.get('status-bar-blame.dateFormat');
  const date = moment(line.date, 'YYYY-MM-DD HH:mm:ss');
  let dateStr;
  if (date.isBefore(moment().subtract(5, 'days'))) {
    dateStr = date.format(dateFormat);
  } else {
    dateStr = date.fromNow();
  }

  if (utils.isCommitted(hash)) {
    return `<a href="#"><span class="author">${line.author}</span> · <span class="date">${dateStr}</span></a>`;
  }

  return `${line.author}`;
}

function formatTooltip({ avatar, subject, author, message }) {
  return `
    <div class="status-bar-blame-tooltip">
      <div class="head">
        <img class="avatar" src="http:${avatar}"/>
        <div class="subject">${subject}</div>
        <div class="author">${author}</div>
      </div>
      <div class="body">${message.replace('\n', '<br>')}</div>
    </div>
  `;
}

class BlameStatusBarView extends HTMLElement {

  init() {
    this.classList.add('inline-block');
    this.editorDisposables = new CompositeDisposable();

    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.workspace.onDidChangeActivePaneItem(this.onDidChangeActivePaneItem.bind(this)),
    );

    this.addEventListener('click', this.onLinkClicked);
    this.disposables.add(new Disposable(() => this.removeEventListener('click', this.onLinkClicked)));
    this.initEditor();
  }

  dispose() {
    this.editorDisposables.dispose();
    this.disposeTooltip();
    this.disposables.dispose();
  }

  get editor() { // eslint-disable-line
    return atom.workspace.getActiveTextEditor();
  }

  async initEditor() {
    this.editorDisposables.dispose();
    this.disposeTooltip();
    if (!this.editor) {
      return;
    }
    // Renew data
    this.blameData = null;
    await this.getBlameData(this.editor);
    this.hasGitRepo = !!utils.findRepo(this.editor.getPath());

    // Renew listeners
    this.editorDisposables = new CompositeDisposable();
    this.editorDisposables.add(
      this.editor.onDidChangeCursorPosition(this.onDidChangeCursorPosition.bind(this)),
    );
    this.editorDisposables.add(
      this.editor.onDidSave(this.onDidChangeActivePaneItem.bind(this, this.editor)),
    );
    this.onDidChangeCursorPosition(this.editor.getCursorBufferPosition());
  }

  async render(row) {
    this.disposeTooltip();
    if (this.blameData) {
      const data = this.blameData[row];
      if (!data) {
        this.innerHTML = '';
        this.hash = null;
        return;
      }
      this.innerHTML = data.html;
      this.hash = data.hash;

      this.registerTooltip();
    } else if (this.hasGitRepo) {
      // No data available for current file
      this.innerHTML = 'Not Committed Yet';
    } else {
      // No git repo for current file
      this.innerHTML = '';
    }
  }

  async registerTooltip() {
    this.disposeTooltip();
    if (this.hash && utils.isCommitted(this.hash)) {
      this.tooltip = await this.addTooltip(this.hash);
    }
  }

  disposeTooltip() {
    if (this.tooltip) {
      this.tooltip.dispose();
      this.tooltip = null;
    }
  }

  onDidChangeActivePaneItem(item) {
    if (!this.editor) {
      this.innerHTML = '';
    }
    if (item === this.editor) {
      this.initEditor();
    }
  }

  onDidChangeCursorPosition({ row, newBufferPosition = {} }) {
    const r = newBufferPosition.row !== undefined ? newBufferPosition.row : row;
    this.render(r);
  }

  async getBlameData() {
    const filePath = this.editor.getPath();
    if (!filePath) { return; }

    const result = await utils.blame(this.editor.getPath());
    if (!result) { return; }

    this.blameData = Object.keys(result).map((key) => {
      const line = result[key];
      const hash = line.rev.replace(/\s.*/, '');
      const lineStr = formatLine(hash, line);
      return {
        html: lineStr,
        hash,
      };
    });
  }

  async onLinkClicked(event) {
    if (!utils.isCommitted(this.hash)) {
      return null;
    }

    if (event.shiftKey) {
      this.copyCommitHash();
    } else {
      await this.openCommitInBrowser();
    }
    return null;
  }

  async openCommitInBrowser() {
    const link = await utils.getCommitLink(this.editor.getPath(), this.hash.replace(/^[\^]/, ''));
    if (link) {
      open(link);
    } else {
      atom.notifications.addInfo('Unknown url.');
    }
  }

  copyCommitHash() {
    const shortHash = this.hash.substring(0, 8);
    atom.clipboard.write(shortHash);
    this.addCopiedTooltip(shortHash);
  }

  async addTooltip(hash) {
    const msg = await utils.getCommit(this.editor.getPath(), hash.replace(/^[\^]/, ''));
    msg.avatar = gravatar.url(msg.email, { s: 80 });
    return atom.tooltips.add(this, {
      title: formatTooltip(msg),
    });
  }

  addCopiedTooltip(hash) {
    this.disposeTooltip();
    this.addNotificationTooltip(`Copied commit hash: ${hash}`);
  }

  addNotificationTooltip(message, timeout = 1500) {
    this.disposeTooltip();

    const tempTooltip = atom.tooltips.add(this, {
      title: message,
      trigger: 'manual',
    });

    setTimeout(() => {
      tempTooltip.dispose();
      this.registerTooltip();
    }, timeout);
  }
}

export default document.registerElement('status-bar-blame', { prototype: BlameStatusBarView.prototype });
