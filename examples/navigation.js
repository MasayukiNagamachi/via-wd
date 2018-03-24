// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const webdriver = require('selenium-webdriver');
const By = webdriver.By;
const Key = webdriver.Key;
const logger = webdriver.logging.getLogger('example');
const until = webdriver.until;

// Example of a navigation script.
// This script searches 'webdriver' with Google.
module.exports.navigate = async (driver) => {
  logger.debug('searching "webdriver" with Google...');
  await driver.get('https://www.google.com/');
  const input = await driver.findElement(By.name('q'));
  await input.sendKeys('webdriver', Key.RETURN);
  await driver.wait(until.titleContains('webdriver'), 1000);
  logger.debug('Done');
};
