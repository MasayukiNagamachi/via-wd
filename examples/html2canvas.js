// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const $ = require('jquery');
const html2canvas = require('html2canvas');

const callback = ARGS[ARGS.length - 1];

html2canvas($(document.body))
  .then((canvas) => {
    callback(canvas.toDataURL("image/png"));
  });
