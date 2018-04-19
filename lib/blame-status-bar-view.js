/** @babel */

import { CompositeDisposable, Disposable } from 'atom';

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
    this.classList.add('inline-block', 'status-bar-blame');

    this.disposables = new CompositeDisposable();
    this.addEventListener('click', this.onLinkClicked);
    this.disposables.add(new Disposable(() => this.removeEventListener('click', this.onLinkClicked)));
  }

  dispose() {
    this.disposables.dispose();
    this.disposables = null;
    this.disposeTooltip();
  }

  /**
   * Event Handlers
   */

  onLinkClicked(event) {
    if (!this.editorHandler) {
      return;
    }

    if (event.shiftKey) {
      this.editorHandler.copyCommitHash();
    } else {
      this.editorHandler.openCommitInBrowser();
    }
  }

  /**
   * Render Methods
   */

  unsaved() {
    this.disposeTooltip();
    this.setInnerHTML('Unsaved');
  }

  notCommitted() {
    this.disposeTooltip();
    this.setInnerHTML('Not Committed Yet');
  }

  clear() {
    this.disposeTooltip();
    this.setInnerHTML('');
  }

  render(data) {
    this.disposeTooltip();
    if (!data) {
      this.setInnerHTML('');
      return;
    }
    this.setInnerHTML(data.html);
  }

  setInnerHTML(string) {
    this.innerHTML = string;
  }

  /**
   * Tooltip Methods
   */

  addTooltip(msg) {
    return atom.tooltips.add(this, {
      title: formatTooltip(msg),
    });
  }

  disposeTooltip() {
    if (this.tooltip) {
      this.tooltip.dispose();
      this.tooltip = null;
    }
  }

  addNotificationTooltip(message, timeout = 1500) {
    this.disposeTooltip();

    const tempTooltip = atom.tooltips.add(this, {
      title: message,
      trigger: 'manual',
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        tempTooltip.dispose();
        resolve();
      }, timeout);
    });
  }

  registerTooltip(msg) {
    this.disposeTooltip();
    if (msg) {
      this.tooltip = this.addTooltip(msg);
    }
  }

  registerCopiedTooltip(hash) {
    return this.addNotificationTooltip(`Copied commit hash: ${hash}`);
  }
}

export default document.registerElement('status-bar-blame', { prototype: BlameStatusBarView.prototype });
