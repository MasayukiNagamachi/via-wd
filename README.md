# wd-runjs

[![npm (scoped)](https://img.shields.io/npm/v/wd-runjs)](https://www.npmjs.com/package/wd-runjs)
[![CI](https://github.com/masnagam/wd-runjs/workflows/CI/badge.svg)](https://github.com/masnagam/wd-runjs/actions?query=workflow%3ACI)
[![Maintainability](https://api.codeclimate.com/v1/badges/b051a52030c4f03b325e/maintainability)](https://codeclimate.com/github/masnagam/wd-runjs/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/b051a52030c4f03b325e/test_coverage)](https://codeclimate.com/github/masnagam/wd-runjs/test_coverage)

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

    -V, --version                      output the version number
    -a, --script-args <arg>            Arguments passed to the JavaScript code (default: )
    -b, --browser <chrome or firefox>  Browser where the JavaScript code will be run (default: chrome)
    -l, --logging <logger:level>       Filters for the local logging of selenium-webdriver (default: )
    -o, --browser-options <json>       Browser specific options (default: [object Object])
    -s, --server [uri]                 Use a WebDriver server which is already running (default: false)
    --async                            Run the JavaScript code asynchronously
    --script-timeout <sec>             Asynchronous script execution time limit in seconds (default: 10)
    -h, --help                         output usage information
```

When it is succeeded to execute the JavaScript code, `wd-runjs` outputs a JSON
array of the following format to stdout.

```
{
  "uri": "<uri>",
  "browser": "<browser>",
  "title": "<title>",
  "result": <result-json>
}
```

When it is failed, `error` is output instead of `result`.

## Examples

Maximum depth of nested elements:

```
$ cat examples/max-depth.js | wd-runjs https://github.com/
[{"uri":"https://github.com/","browser":"chrome","title":"...","result":12}]
```

Tag statistics:

```
$ cat examples/tags.js | wd-runjs https://github.com/
[{"uri":"https://github.com/","browser":"chrome","title":"...","result":{"DD":3,"A":34,...}}]
```

By using [jq], it is possible to process a result JSON as follows:

```
$ cat examples/tags.js | wd-runjs https://github.com/ | \
    jq '.[] | { uri, browser, countTags: [.result[]] | add }'
{
  "uri": "https://github.com/",
  "browser": "chrome",
  "countTags": 496
}
```

Use of a URI list:

```
$ cat uris
http://www.bbc.com/
http://edition.cnn.com/
http://abcnews.go.com/
$ echo "return 'hello';" | wd-runjs $(cat uris)
```

NOTE: The concurrency option has been removed.  Because functions which were
used for implementing this feature have been removed from the latest
`selenium-webdriver` package.  This feature might be implemented again in
future.

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

Run JavaScript code asynchronously:

```
$ browserify examples/html2canvas.js | \
    wd-runjs --async -a li.vevent https://www.w3.org/
[{"uri":"https://www.w3.org/","browser":"chrome","title":"...","result":["data:image/png;base64,...",...]}]
```

Before running the above command, it is necessary to install [Browserify],
[jQuery] and [html2canvas].

## Logging

By using the logging option, it is possible to output messages for debugging.

The following loggers are defined in wd-runjs.

* wd-runjs.script-runner
* webdriver.Builder
* webdriver.http
* webdriver.http.Executor

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

## Running JavaScript code on an existing browser window

At the moment, this feature works only with the ChromeDriver.

```
$ cat script.js | wd-runjs -o '{"debuggerAddress": "localhost:9222"}'
```

The JavaScript code will be executed on the current tab/window of the existing
Chrome browser launched with `--remote-debugging-port=9222`.

## License

This software is distributed under the MIT license.  See [LICENSE](./LICENSE)
file for details.

[npm-version]: https://img.shields.io/npm/v/wd-runjs.svg
[npm-site]: https://www.npmjs.com/package/wd-runjs
[build-status]: https://travis-ci.com/masnagam/wd-runjs.svg?branch=master
[build-site]: https://travis-ci.com/masnagam/wd-runjs
[codacy-status]: https://api.codacy.com/project/badge/Grade/93778b9da3c14490807a75efd893fc55
[codacy-site]: https://www.codacy.com/app/masnagam/wd-runjs?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=masnagam/wd-runjs&amp;utm_campaign=Badge_Grade
[maintainability-status]: https://api.codeclimate.com/v1/badges/b051a52030c4f03b325e/maintainability
[maintainability-site]: https://codeclimate.com/github/masnagam/wd-runjs/maintainability
[coverage-status]: https://api.codeclimate.com/v1/badges/b051a52030c4f03b325e/test_coverage
[coverage-site]: https://codeclimate.com/github/masnagam/wd-runjs/test_coverage
[Selenium WebDriver]: https://www.npmjs.com/package/selenium-webdriver
[jq]: https://stedolan.github.io/jq/
[masnagam/docker-compose-collection]: https://github.com/masnagam/docker-compose-collection/tree/master/selenium-grid
[Browserify]: http://browserify.org/
[jQuery]: http://jquery.com/
[html2canvas]: http://html2canvas.hertzen.com/
