English | [日本語](README.ja.md)

# Copy This Block

This is a web browser extension for Firefox and Google Chrome.

## About This Extension

This allows you to copy tables, sample codes, paragraphs, list items,
and other block-like structures from a web page to the clipboard in an
appropriate format without accurate cursor operation.

To copy a block,

1. Select a part (even just one character) of the block, and
2. click "Copy This Block" in the context menu.

It then extends the selection range to the nearest block boundary and
copies all the contents of the selected block to the clipboard in both
the plain text and HTML format.

Before sending data to the clipboard, it removes unnecessary
whitespaces, DIVs, SPANs, and empty elements from the contents, and
formats tables in the CSV format.  Hence, without any additional edit,
you can paste tables to a spreadsheet, sample codes to an editor, and
document fragments to a word processor.

## Usage Notes

* When you attempt to copy the contents of a frame, it requests you an
  additional permission to access data in the frame.  The permission
  is removed as soon as the copying is complete.
* If sufficient permission is not granted, such as the case in which
  you use the extension in a restricted page or you did not grant a
  requested permission, it falls back to the normal copy command.
* The keyboard shortcut `Alt+Shift+C` is available.  It works for most
  cases, but it does not work in a frame, and It cannot fall back to
  the normal copy command if it fails.  In such a case, use the
  context menu instead of the keyboard shortcut.
* In the case when the blocks are nested and you would like to copy
  the outer one, select an unnested part or a range across the inner
  block boundary so that the extension goes to the outer block boundary.

## Technical Details

* It injects a content script on demand.  It does not declare the
  content script in manifest.json so as to reduce memory usage.
* It searches for the set of innermost *block boxes* in terms of
  CSS, including anonymous ones, that covers all the leaf nodes in the
  selection range.  If all the child nodes of a block node is in the
  set, they are replaced with the parent node.
* Whitespaces are collapsed in a similar way to CSS's white-space
  processing model.  It only looks at computed styles rather than
  element names except for the BR element, which involves a line
  break.
* The copied HTML is simplified by the following rules:
  * Except for the TD, TH, and LI elements, empty blocks adjacent to
    another block or block boundary are removed.
  * Except for the BR and IMG elements, empty inline elements are
    removed.
  * Except for the A, BR, and IMG elements, adjacent inline elements
    of the same name are concatinated.
  * The DIV and SPAN elements that does not change the boundaries
    between blocks and inlines are removed.
  * Attributes are removed except for A.href, IMG.src, IMG.alt,
    TD.colspan, TD.rowspan, TH.colspan, TD.rowspan, INPUT.type, and
    INPUT.value.

## Contributing

Put your comments and proposals to [GitHub Issues].
To submit patches and additions, create a pull request on GitHub.

We kindly ask all the contributors to agree with the following policy:
*keep everything minimal and minimum*.  We believe that this is the
best way to continue the project without loosing its clarity and
activity.  We will not accept requests and proposals that make things
complicated.  Feel free to fork the project for your specific usecase.

## License

This software is licensed under the MIT License.  See [LICENSE] for
details.


[GitHub Issues]: https://github.com/uenoB/copy_this_block/issues
[LICENSE]: LICENSE
