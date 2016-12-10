# via-wd

[![Build Status][build-status]][build-page]
[![Coverage Status][coverage-status]][coverage-page]

`via-wd` is a tiny command which executes a JavaScript snippet on browsers by
piping stdin via [Selenium Webdriver].

## Prerequisite

`via-wd` uses a Selenium server for controlling remote browsers.

If Docker has already been installed on your local machine, you can use
`docker-compose` with [docker-compose.yml](./docker-compose.yml) which starts a
Selenium Hub container and a Selenium node with Chrome installed.

## Usage

```
Usage: via-wd [options] <uri ...>

Executes a JavaScript snippet on browsers by piping stdin via Selenium Webdriver

Options:

  -h, --help               output usage information
  -V, --version            output the version number
  -b, --browser <browser>  Browser where the script will be executed (default: chrome)
  -s, --server <uri>       URI of Selenium server (default: http://localhost:4444/wd/hub)
```

## Examples

Tag statistics:

```sh
$ cat examples/tags.js | bin/via-wd https://github.com
```

Maximum depth of nested elements:

```sh
$ cat examples/max-depth.js | bin/via-wd https://github.com
```

## Prerequisite

* Selenium WebDriver

It is easy to use docker Selenium images.

[Selenium Webdriver]: https://www.npmjs.com/package/selenium-webdriver
[build-status]: https://travis-ci.org/MasayukiNagamachi/via-wd.svg?branch=master
[build-page]: https://travis-ci.org/MasayukiNagamachi/via-wd
[coverage-status]: https://codecov.io/gh/MasayukiNagamachi/via-wd/branch/master/graph/badge.svg
[coverage-page]: https://codecov.io/gh/MasayukiNagamachi/via-wd
