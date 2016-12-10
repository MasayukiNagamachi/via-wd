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
