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
