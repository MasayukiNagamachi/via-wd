// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

let elements = document.querySelectorAll('*');
let tags = {};
for (let i = 0; i < elements.length; ++i) {
  const tagName = elements[i].tagName;
  if (tags[tagName] === undefined) {
    tags[tagName] = 1;
  } else {
    tags[tagName] = tags[tagName] + 1;
  }
}
return tags;
