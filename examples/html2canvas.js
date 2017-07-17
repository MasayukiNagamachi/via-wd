// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const $ = require('jquery');
const html2canvas = require('html2canvas');

if (ARGS.length < 2) {
  throw new Error('Selector is required');
}

const selector = ARGS[0];
const callback = ARGS[ARGS.length - 1];

Promise.all($(selector).map(function() {
  return html2canvas(this)
    .then((canvas) => canvas.toDataURL('image/png'));
}))
  .then(callback);
