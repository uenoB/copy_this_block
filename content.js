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
(function() {

function fillSpan(rows) {
  function down(t) { return {y: Math.min(t.y-1, 1), body: ''}; }
  var prev = [];
  var dst = rows.map(cells => {
    var curr = [];
    cells.forEach(cell => {
      var x = (cell.attr || {})['colspan'] || 1;
      var y = (cell.attr || {})['rowspan'] || 1;
      while (curr.length < prev.length && prev[curr.length].y > 1)
        curr.push(down(prev[curr.length]));
      curr.push({y: y, body: cell});
      for (let k = x; k > 1; k--)
        curr.push({y: y, body: ''});
    });
    while (curr.length < prev.length)
      curr.push(down(prev[curr.length]));
    prev = curr;
    return curr.map(i => i.body);
  });
  for (let i = dst.length - 1; i > 0; i--)
    while (dst[i-1].length < dst[i].length)
      dst[i-1].push('');
  return dst;
}

function getTable(item) {
  var rows = [];
  function findColumns(item) {
    if (typeof item === 'string') return;
    if (item.name === 'TD' || item.name === 'TH')
      rows[rows.length-1].push(item);
    else item.body.forEach(findColumns);
  }
  function findRows(item) {
    if (typeof item === 'string') return;
    if (item.name === 'TR') {
      rows.push([]);
      item.body.forEach(findColumns);
    } else
      item.body.forEach(findRows);
  }
  item.body.forEach(findRows);
  return fillSpan(rows);
}

function renderCSV(rows) {
  return rows.map(cells =>
    cells.map(cell => {
      var text = cell && render(cell.body).replace(/^\n+|\n+$/, '');
      if (text.indexOf(',') >= 0 || /["\n]/.test(text))
        text = '"' + text.replace(/"/g, '""') + '"';
      return text;
    }).join(',') + '\n'
  ).join('');
}

function render(items) {
  var dst = [];
  var beginLine = true;
  var beginFile = true;
  function print(s) {
    if (!s) return;
    dst.push(s);
    beginLine = /\n$/.test(s);
    beginFile = false;
  }
  function renderItem(item) {
    if (typeof item === 'string') print(item);
    else if (item.name === 'BR') print('\n');
    else if (item.name === 'INPUT' && (item.attr || {})['type'] === 'text')
      print(item.attr['value']);
    else {
      var isBlock = item.outer === 'block';
      if (isBlock && !beginLine) print('\n');
      if (isBlock && !beginFile) print('\n');
      if (item.name === 'TABLE')
        print(renderCSV(getTable(item)));
      else
        item.body.forEach(renderItem);
      if (isBlock && !beginLine) print('\n');
    }
  }
  items.forEach(renderItem);
  return dst.join('');
}

function serialize(items) {
  function create(item) {
    if (typeof item === 'string')
      return document.createTextNode(item);
    else {
      var e = document.createElement(item.name);
      item.body.forEach(i => { e.appendChild(create(i)); });
      for (let k in item.attr || {}) e.setAttribute(k, item.attr[k]);
      return e;
    }
  }
  var e = document.createElement('DIV');
  items.forEach(i => { e.appendChild(create(i)); });
  return e.innerHTML;
}

function simplify(items) {
  function isEmpty(s, i) {
    return typeof i !== 'string' && i.outer === s &&
           i.body.length === 0 && i.attr == null;
  }
  function outer(i) {
    return typeof i === 'string' ? 'inline' : i.outer;
  }
  function simple(item) {
    if (typeof item === 'string') return item;
    // process all the contents
    var body = item.body.map(simple).filter(i => i);
    // remove empty block adjacent to another block except for TD, TH, LI
    body = body.filter((i, n) =>
      !(isEmpty('block', i) &&
        ['TD','TH','LI'].indexOf(i.name) < 0 &&
        (n === 0 || n === body.length - 1 ||
         isEmpty('block', body[n-1]) || isEmpty('block', body[n+1]))));
    // remove empty inline except for BR, IMG
    body = body.filter(i =>
      !(isEmpty('inline', i) && ['BR','IMG'].indexOf(i.name) < 0));
    // concatinate adjacent inlines of the same name except for A, BR, IMG
    for (let i = 0; i < body.length - 1;)
      if (typeof body[i] !== 'string' && typeof body[i+1] !== 'string' &&
          body[i].name === body[i+1].name &&
          body[i].outer === 'inline' && body[i].inner === 'inline' &&
          body[i+1].outer === 'inline' && body[i+1].inner === 'inline' &&
          ['A','BR','IMG'].indexOf(body[i].name) < 0 &&
          body[i].attr === null && body[i+1].attr === null &&
          body[i].whiteSpace === body[i+1].whiteSpace) {
        body[i] = Object.assign(Object.assign({}, body[i]),
          {body: body[i].body.concat(body[i+1].body)});
        body.splice(i+1, 1);
      } else i++;
    // expand DIV and SPAN if they don't change box boundary
    body = body.map((i, n) => {
      if (typeof i === 'string') return [i];
      if (i.name !== 'DIV' && i.name !== 'SPAN') return [i];
      if (i.body.length > 0 &&
          outer(i.body[0]) === i.outer &&
          outer(i.body[i.body.length-1]) === i.outer)
        return i.body;
      if ((n === 0 || outer(body[n-1]) === i.outer) &&
          (n === body.length - 1 || outer(body[n+1]) === i.outer))
        return i.body;
      return [i];
    }).reduce((i,z) => i.concat(z), []);
    return Object.assign(Object.assign({}, item), {body: body});
  }
  return items.map(simple).filter(i => !isEmpty('block', i));
}

function trimSpace(items) {
  var trimR = false;
  var trimL = null;
  function trimLeft() {
    if (trimL == null) return;
    var s = trimL.body[trimL.index].replace(/ +$/, '');
    if (s) trimL.body[trimL.index] = s;
    else trimL.body.splice(trimL.index, 1);
    trimL = null;
  }
  function trim(box) {
    var inPreLine = box.whiteSpace === 'pre-line';
    var inPre = !inPreLine && /^pre/.test(box.whiteSpace);
    var inBlock = box.inner === 'block';
    var body = [];
    // remove spaces at the beginning of a block
    if (inBlock) trimR = true;
    // space collapsing never occur beyond blocks
    if (inBlock) trimL = null;
    for (let i = 0; i < box.body.length; i++) {
      var item = box.body[i];
      if (typeof item === 'string') {
        // normalize linebreaks
        item = item.replace(/\r\n?/g, '\n');
        // remove spaces surrounding a linebreak
        if (!inPre) item = item.replace(/[\t ]*\n[\t ]*/g, '\n');
        // render linebreaks as either a space, zero width space, or nothing
        if (!inPre && !inPreLine) item = item.replace(/\n/g, ' ');
        // replace tab with space and remove spaces following another space
        if (!inPre) item = item.replace(/[\t ]+/g, ' ');
        // remove spaces beyond inline element boundary
        if (!inPre && trimR) item = item.replace(/^ +/, '');
        // if the text ends with a space, following space must be removed
        if (item) trimR = !inPre && / $/.test(item);
        // remember where the last space that may be removed is
        if (item) trimL = trimR ? {body: body, index: body.length} : null;
        // keep unempty text
        if (item) body.push(item);
      } else {
        var isBlock = item.outer === 'block' || item.name === 'BR';
        // remove spaces followed by a block element or BR
        if (isBlock) trimLeft();
        body.push(trim(item));
        // remove spaces following a block element or BR
        if (isBlock) trimR = true;
      }
    }
    // remove spaces at the end of a block
    if (inBlock) trimLeft();
    // space collapsing never occur beyond blocks
    if (inBlock) trimR = false;
    return Object.assign(Object.assign({}, box), {body: body});
  }
  return trim({body: items, inner: 'block', whiteSpace: 'normal'}).body;
}

function getTree(nodes) {
  function getNodeList(nodes) {
    return Array.prototype.map.call(nodes, getNode).filter(i => i);
  }
  function getNode(node) {
    switch (node.nodeType) {
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
      return node.nodeValue;
    case Node.ELEMENT_NODE:
      var style = window.getComputedStyle(node);
      var display = style.display || 'inline';
      if (display === 'none') return null;
      var whiteSpace = style.whiteSpace || 'normal';
      var inner = 'block', outer = 'block';
      if (/^inline/.test(display)) {
        outer = 'inline';
        inner = display === 'inline' ? 'inline' : 'block';
      }
      var body =
        node.offsetWidth === 0 || node.offsetHeight === 0 ?
          [] : getNodeList(node.childNodes);
      var attr = {};
      switch (node.nodeName) {
      case 'A':
        if (node.href) attr['href'] = node.href;
        break;
      case 'IMG':
        if (node.src) attr['src'] = node.src;
        if (node.alt) attr['alt'] = node.alt;
        break;
      case 'TD': case 'TH':
        if (node.colSpan > 1) attr['colspan'] = node.colSpan;
        if (node.rowSpan > 1) attr['rowspan'] = node.rowSpan;
        break;
      case 'INPUT':
        if (node.type && node.value) {
          attr['type'] = node.type;
          if (node.type !== 'password') attr['value'] = node.value;
        }
        break;
      case 'TEXTAREA':
        if (node.value) body = [node.value];
        break;
      default:
        break;
      }
      if (Object.keys(attr).length === 0) attr = null;
      return {
        name: node.nodeName,
        attr: attr,
        body: body,
        whiteSpace: whiteSpace,
        inner: inner,
        outer: outer
      };
    default:
      return null;
    }
  }
  return getNodeList(nodes);
}

function copyToClipboard(text, html) {
  document.addEventListener('copy', function f(e) {
    document.removeEventListener('copy', f, true);
    e.stopImmediatePropagation();
    e.preventDefault();
    e.clipboardData.setData('text/html', html);
    e.clipboardData.setData('text/plain', text);
  }, true);
  document.execCommand('copy');
}

function isBlock(elem) {
  if (!elem || elem.nodeType !== Node.ELEMENT_NODE || !elem.hasChildNodes())
    return false;
  var style = window.getComputedStyle(elem);
  return ['block', 'list-item', 'table'].indexOf(style.display) >= 0;
}

function findBlock(node) {
  while (node && !isBlock(node)) {
    // inline elements surrounded by blocks involve an anonymous block
    var p = node.previousSibling, n = node.nextSibling;
    while (p && !isBlock(p)) p = p.previousSibling;
    while (n && !isBlock(n)) n = n.nextSibling;
    if (p || n) {
      var a = [];
      var e = p ? p.nextSibling : node.parentNode.firstChild;
      for (; e !== n; e = e.nextSibling) a.push(e);
      return a;
    }
    node = node.parentNode;
  }
  return node ? [node] : [];
}

function getLeafNodes(r) {
  function nextNode(n, post) {
    if (n.firstChild && !post) return n.firstChild;
    while (n && !n.nextSibling) n = n.parentNode;
    return n && n.nextSibling;
  }
  var containStart, e1, containEnd, e2;
  e1 = r.startContainer;
  if (e1.nodeValue)
    containStart = r.startOffset < e1.nodeValue.length;
  else {
    containStart = r.startOffset < e1.childNodes.length;
    e1 = containStart ? e1.childNodes[r.startOffset] : e1.lastChild;
  }
  containEnd = r.endOffset > 0;
  e2 = r.endContainer;
  if (!e2.nodeValue) e2 = e2.childNodes[Math.max(r.endOffset-1,0)];
  var a = [];
  if (containEnd) e2 = nextNode(e2, true);
  if (e1 !== e2 && !containStart) e1 = nextNode(e1);
  for (; e1 !== e2; e1 = nextNode(e1))
    if (!e1.firstChild) a.push(e1);
  return a;
}

function getBlocks(nodes) {
  var a = [];
  for (let i = 0; i < nodes.length; i++) {
    // skip adjacent leaf node, which never contributes block search
    if (i > 0 && nodes[i-1].nextSibling === nodes[i]) continue;
    // skip nodes contained by the block already found
    if (a.length > 0 && a[a.length-1][0].contains(nodes[i])) continue;
    var e = findBlock(nodes[i]);
    if (e.length > 0) a.push(e);
  }
  // keep disjoint tree only
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a.length; j++)
      if (i !== j && a[i] && a[j] && a[i][0].contains(a[j][0]))
        a[j] = null;
  a = a.reduce((z,i) => i ? z.concat(i) : z, []);
  // if all siblings are enumerated, replace them with their parent.
  var done;
  do {
    done = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i].previousSibling || !isBlock(a[i].parentNode)) continue;
      let j = i;
      while (j < a.length - 1 && a[j].nextSibling === a[j+1]) j++;
      if (a[j].nextSibling === null) {
        a.splice(i, j - i + 1, a[i].parentNode);
        done = false;
      } else i = j;
    }
  } while (!done);
  return a;
}

function copyThisBlock() {
  var s = window.getSelection();
  var l = [];
  for (let i = 0; i < s.rangeCount; i++) {
    var r = s.getRangeAt(i);
    l = l.concat(getLeafNodes(r));
  }
  var e = getBlocks(l);
  var t1 = getTree(e);
  var t2 = trimSpace(t1);
  var t3 = simplify(t2);
  var txt = render(t3);
  var html = serialize(t3);
  if (!txt && !html) return false;
  console.log(txt);
  console.log(html);
  copyToClipboard(txt, html);
  var start = e[0], last = e[e.length-1];
  s.setBaseAndExtent(
    start, 0,
    last, last.nodeValue ? last.nodeValue.length : last.childNodes.length);
  return true;
}

if (typeof exports === 'undefined')
  return copyThisBlock();
else {
  exports.fillSpan = fillSpan;
  exports.getTable = getTable;
  exports.renderCSV = renderCSV;
  exports.render = render;
  exports.serialize = serialize;
  exports.simplify = simplify;
  exports.trimSpace = trimSpace;
  exports.getTree = getTree;
  exports.copyToClipboard = copyToClipboard;
  exports.isBlock = isBlock;
  exports.findBlock = findBlock;
  exports.getLeafNodes = getLeafNodes;
  exports.getBlocks = getBlocks;
  exports.copyThisBlock = copyThisBlock;
  return exports;
}

})();
