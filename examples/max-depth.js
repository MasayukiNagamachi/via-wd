// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

function getDepth(element, depth) {
  let maxDepth = depth;
  for (let i = 0; i < element.children.length; ++i) {
    let childDepth = getDepth(element.children[i], depth + 1);
    if (maxDepth < childDepth) {
      maxDepth = childDepth;
    }
  }
  return maxDepth;
}

return getDepth(document.documentElement, 1);
