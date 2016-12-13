# wd-runjs

[![Build Status][build-status]][build-page]
[![Coverage Status][coverage-status]][coverage-page]

`wd-runjs` is a tiny command which runs JavaScript code on browsers by piping
stdin via [Selenium WebDriver].

## Prerequisite

`wd-runjs` uses a Selenium Server for controlling remote browsers.

If Docker has already been installed on your local machine, you can use
`docker-compose` with [docker-compose.yml](./docker-compose.yml) which starts a
Selenium Grid Hub and a Selenium node with Chrome installed.

## Usage

```
  Usage: wd-runjs [options] <uri ...>

  Run JavaScript code on browsers by piping stdin via Selenium WebDriver

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -b, --browser <browser>     Browser where the JavaScript code will be run (default: chrome)
    -c, --concurrency <number>  Number of ControlFlows to be run at the same time (default: 1)
    -s, --server <uri>          URI of a Selenium Server (default: http://localhost:4444/wd/hub)
```

When it is succeeded to execute the snippet, `wd-runjs` outputs a JSON array of
the following format to stdout.

```
{
  "uri": "<uri>",
  "browser": "<browser>",
  "result": <result-json>
}
```

When it is failed, `error` is output instead of `result`.

## Examples

Maximum depth of nested elements:

```
$ cat examples/max-depth.js | wd-runjs https://github.com/

[{"uri":"https://github.com/","browser":"chrome","result":12}]
```

Tag statistics:

```
$ cat examples/tags.js | wd-runjs https://github.com/

[{"uri":"https://github.com/","browser":"chrome","result":{"DD":3,"A":34,...}}]

```

By using [jq], it is possible to process a result JSON as follow.

```
$ cat examples/tags.js | wd-runjs https://github.com/ | \
    jq '.[] | { uri, browser, countTags: [.result[]] | add }'

{
  "uri": "https://github.com/",
  "browser": "chrome",
  "countTags": 257
}
```

Use of a URI list:

```
$ cat uris
http://www.bbc.com/
http://edition.cnn.com/
http://abcnews.go.com/
$ echo "return 'hello';" | wd-runjs -c 3 $(cat uris)
```

It is recommended to specify the concurrency number less than the number of
available Chrome instances.

## License

This software is distributed under the MIT license.  See [LICENSE](./LICENSE)
file for details.

[build-status]: https://travis-ci.org/masnagam/wd-runjs.svg?branch=master
[build-page]: https://travis-ci.org/masnagam/wd-runjs
[coverage-status]: https://codecov.io/gh/masnagam/wd-runjs/branch/master/graph/badge.svg
[coverage-page]: https://codecov.io/gh/masnagam/wd-runjs
[Selenium WebDriver]: https://www.npmjs.com/package/selenium-webdriver
[jq]: https://stedolan.github.io/jq/
