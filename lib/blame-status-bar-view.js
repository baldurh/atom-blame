/** @babel */

import gravatar from 'gravatar';
import open from 'open';
import moment from 'moment';
import { CompositeDisposable, Disposable } from 'atom';
import { isCommitted, findRepo, blameFile, getCommit, getCommitLink } from './utils';

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
    this.lastRow = null;
    this.hash = null;
    this.hasGitRepo = !!findRepo(this.editor.getPath());

    this.blameData = await this.getBlameData(this.editor);
    this.messages = await this.getAllMessages(this.blameData);

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

  render(row) {
    this.disposeTooltip();
    if (this.blameData) {
      const data = this.blameData[row];
      if (!data) {
        this.innerHTML = '';
        return;
      }
      this.innerHTML = data.html;
      this.hash = data.hash;

      this.registerTooltip(this.messages[row]);
    } else if (this.hasGitRepo) {
      // No data available for current file
      this.innerHTML = 'Not Committed Yet';
    } else {
      // No git repo for current file
      this.innerHTML = '';
    }
  }

  registerTooltip(msg) {
    this.disposeTooltip();
    if (msg && this.hash && isCommitted(this.hash)) {
      this.tooltip = this.addTooltip(msg);
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
    if (!this.lastRow || this.lastRow !== r) {
      this.hash = null;
      this.render(r);
      this.lastRow = r;
    }
  }

  async getBlameData() {
    if (!this.hasGitRepo) { return null; }

    const filePath = this.editor.getPath();
    if (!filePath) { return null; }

    const result = await blameFile(this.editor.getPath());
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

  async onLinkClicked(event) {
    if (!isCommitted(this.hash)) {
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
    const link = await getCommitLink(this.editor.getPath(), this.hash.replace(/^[\^]/, ''));
    if (link) {
      open(link);
    } else {
      this.addNotificationTooltip('Unknown url. Shift-click to copy hash.', 2000);
    }
  }

  copyCommitHash() {
    const shortHash = this.hash.substring(0, 8);
    atom.clipboard.write(shortHash);
    this.addCopiedTooltip(shortHash);
  }

  addTooltip(msg) {
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

  async getTooltipContent(hash) {
    const msg = await getCommit(this.editor.getPath(), hash.replace(/^[\^]/, ''));
    msg.avatar = gravatar.url(msg.email, { s: 80 });
    return msg;
  }

  getAllMessages(data) {
    if (!data) {
      return null;
    }
    return Promise.all(data.map(({ hash }) => {
      if (isCommitted(hash)) {
        return this.getTooltipContent(hash);
      }
      return null;
    }));
  }
}

export default document.registerElement('status-bar-blame', { prototype: BlameStatusBarView.prototype });
