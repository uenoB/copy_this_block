/*
 * Copy This Block
 * Copyright (C) 2018 Katsuhiro Ueno
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
'use strict';

chrome.runtime.onStartup.addListener(() => {
  chrome.contextMenus.create({
    id: 'copy-this-block',
    title: chrome.i18n.getMessage('Copy_This_Block'),
    contexts: ['selection']
  });
});

function copyThisBlock(info, tab) {
  function start() {
    var origins = [];
    if (!tab.active && info.pageUrl) origins.push(info.pageUrl);
    if (info.frameId && info.frameUrl) origins.push(info.frameUrl);
    if (origins.length === 0)
      executeScript(k => { k(); });
    else {
      // request additional permission if the target is in a frame
      var perm = {origins: origins};
      chrome.permissions.request(perm, granted => {
        if (chrome.runtime.lastError || !granted)
          fail(chrome.runtime.lastError);
        else
          executeScript(k => { chrome.permissions.remove(perm, k); });
      });
    }
  }
  function executeScript(removePermission) {
    var args = {file: '/content.js'};
    if (info.frameId) args.frameId = info.frameId;
    // inject the content script on demand in order to reduce memory usage.
    chrome.tabs.executeScript(tab.id, args, result => {
      var error = chrome.runtime.lastError;
      removePermission(() => {
        if (error || chrome.runtime.lastError || !result || !result[0])
          fail(error || chrome.runtime.lastError);
      });
    });
  }
  function fail(error) {
    if (info.selectionText) {
      // if an error occurred, perform the same as a normal copy command
      var t = document.createElement('textarea');
      t.value = info.selectionText;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
    }
    if (error)
      if (Error.isPrototypeOf(error)) throw error;
      else throw Error(error.message);
  }
  if (!info) info = {};
  if (!tab) fail(null);
  else start();
}

chrome.contextMenus.onClicked.addListener(copyThisBlock);

chrome.commands.onCommand.addListener(() => {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    // FIXME: info is missing and therefore it cannot copy anything
    // in a frame and cannot fall back to normal copy command when it fails.
    // There seems no way in the WebExtensions API to obtain them from a
    // onCommand listener, whereas onClicked listners receive them.
    if (tabs[0]) copyThisBlock(null, tabs[0]);
  });
});
