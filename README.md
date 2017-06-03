# wd-runjs

[![NPM Version][npm-version]][npm-site]
[![Build Status][build-status]][build-site]
[![Coverage Status][coverage-status]][coverage-site]
[![Dependency Status][dependency-status]][dependency-site]

`wd-runjs` is a tiny command which runs JavaScript code on browsers by piping
stdin via [Selenium WebDriver].

## Prerequisite

`wd-runjs` uses the WebDriver or the Selenium Server for running JavaScript code
on browsers.

If you have already installed Docker onto your local machine, you can use
`docker-compose` for starting a Selenium Grid Hub and Selenium nodes.  See
[masnagam/docker-compose-collection] for details.

## Usage

```
  Usage: wd-runjs [options] [URI, path to a navigation script or a window index starting with @ ...]

  Run JavaScript code on browsers by piping stdin via Selenium WebDriver

  Options:

    -h, --help                    output usage information
    -V, --version                 output the version number
    -b, --browser <browser>       Browser where the JavaScript code will be run (default: chrome)
    -c, --concurrency <number>    Number of ControlFlows to be run at the same time (default: 1)
    -l, --logging <logger:level>  Filters for the local logging of selenium-webdriver (default: '')
    -o, --browser-options <json>  Browser specific options (default: [object Object])
    -s, --server [uri]            Use a WebDriver server which is already running (default: false)
```

When it is succeeded to execute the JavaScript code, `wd-runjs` outputs a JSON
array of the following format to stdout.

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

By using [jq], it is possible to process a result JSON as follows:

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

Navigation script:

```
$ cat examples/tags.js | wd-runjs examples/navigation.js
```

The navigation script has to export `navigate()` function like below:

```javascript
module.exports.navigate = (driver) => {
  driver.get('http://www.google.com/ncr');
  ...
};
```

By using the navigation script, it is possible to run a script on web pages
where the user authentication is required.

## Logging

By using the logging option, it is possible to output messages for debugging.

The following loggers are defined in wd-runjs.

* wd-runjs.flow-pool
* wd-runjs.script-runner
* webdriver.Builder
* webdriver.http
* webdriver.http.Executor
* promise

For available levels, see [selenium-webdriver's document](http://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/logging_exports_Level.html).

It is possible to specify multiple logging options as follows:

```
$ wd-runjs -l wd-runjs:DEBUG -l promise:FINER https://github.com/
```

For outputting all log messages, specify the logging option like below:

```
$ wd-runjs -l :ALL https://github.com/
```

At this time, [the remote logging](https://github.com/SeleniumHQ/selenium/wiki/Logging)
is not supported.

## Connecting to an existing browser

Chrome running with `--remote-debugging-port=9222`:

```
$ wd-runjs -o '{"debuggerAddress": "localhost:9222"}'
```

The JavaScript code will be executed on the current tab/window of the existing
Chrome browser.

At the moment, this feature only works with the ChromeDriver.

## License

This software is distributed under the MIT license.  See [LICENSE](./LICENSE)
file for details.

[build-status]: https://travis-ci.org/masnagam/wd-runjs.svg?branch=master
[build-site]: https://travis-ci.org/masnagam/wd-runjs
[coverage-status]: https://codecov.io/gh/masnagam/wd-runjs/branch/master/graph/badge.svg
[coverage-site]: https://codecov.io/gh/masnagam/wd-runjs
[dependency-status]: https://gemnasium.com/badges/github.com/masnagam/wd-runjs.svg
[dependency-site]: https://gemnasium.com/github.com/masnagam/wd-runjs
[npm-version]: https://img.shields.io/npm/v/wd-runjs.svg
[npm-site]: https://www.npmjs.com/package/wd-runjs
[Selenium WebDriver]: https://www.npmjs.com/package/selenium-webdriver
[jq]: https://stedolan.github.io/jq/
[masnagam/docker-compose-collection]: https://github.com/masnagam/docker-compose-collection/tree/master/selenium-grid
