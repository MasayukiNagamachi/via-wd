//
// Copyright (c) 2016 Masayuki Nagamachi <masayuki.nagamachi@gmail.com>
//
// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const moment = require('moment');
const webdriver = require('selenium-webdriver');
const util = require('util');

const expect = chai.expect;
chai.use(require('sinon-chai'));

describe('logging', () => {
  const logging = require('.').logging;

  describe('setFilters', () => {
    let logger = null;

    beforeEach(() => {
      logger = sinon.createStubInstance(webdriver.logging.Logger);
      sinon.stub(webdriver.logging, 'getLogger', (name) => {
        return logger;
      });
    });

    afterEach(() => {
      webdriver.logging.getLogger.restore();
    });

    context('when level is a non-empty string', () => {
      it('should call Logger.setLevel with a specified level', () => {
        logging.setFilters([{ logger: 'test', level: 'DEBUG' }]);
        expect(logger.setLevel).to.have.been.calledOnce;
        expect(logger.setLevel)
          .to.have.been.calledWith(webdriver.logging.Level.DEBUG);
      });
    });

    context('when level is an empty string', () => {
      it('should call Logger.setLevel with null', () => {
        logging.setFilters([{ logger: 'test', level: '' }]);
        expect(logger.setLevel).to.have.been.calledOnce;
        expect(logger.setLevel).to.have.been.calledWith(null);
      });
    });
  });

  describe('enable/disable', () => {
    let clock = null;
    let sink = null;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      sink = sinon.spy();
      logging.setSink(sink);
      logging.setFilters([{ logger: 'test', level: 'DEBUG' }]);
    });

    afterEach(() => {
      logging.setFilters([{ logger: 'test', level: '' }]);
      logging.setSink(null);
      sink = null;
      clock.restore();
      clock = null;
    });

    it('should call a log sink function for logging', () => {
      const logger = webdriver.logging.getLogger('test');
      logger.debug('debug1');
      logger.fine('fine1');
      logging.enable();
      logger.debug('debug2');
      logger.fine('fine2');
      logging.disable();
      expect(sink).to.have.been.calledOnce;
      expect(sink).to.have.been.calledWith(util.format(
        '[%s][%s] [test] debug2',
        moment(0).format(), webdriver.logging.Level.DEBUG));
    });
  });
});

describe('FlowPool', () => {
  const FlowPool = require('.').FlowPool;

  beforeEach(() => {
    sinon.stub(webdriver.promise, 'ControlFlow');
  });

  afterEach(() => {
    webdriver.promise.ControlFlow.restore();
  });

  describe('#constructor', () => {
    it('should create ControlFlows as many as the number of cuncurrency ', () => {
      new FlowPool(10);
      expect(webdriver.promise.ControlFlow).to.have.callCount(10);
    });
  });

  describe('#getFlow', () => {
    it('should return objects cyclically', () => {
      const flowPool = new FlowPool(2);
      const flow1 = flowPool.getFlow();
      const flow2 = flowPool.getFlow();
      expect(flowPool.getFlow()).to.equal(flow1);
      expect(flowPool.getFlow()).to.equal(flow2);
      expect(flowPool.getFlow()).to.equal(flow1);
      expect(flowPool.getFlow()).to.equal(flow2);
    });
  });
});

describe('ScriptRunner', () => {
  const ScriptRunner = require('.').ScriptRunner;

  let driverStub, builderStub;

  beforeEach(() => {
    driverStub = webdriver.promise.Promise.resolve();
    driverStub.get = sinon.stub();
    driverStub.executeScript = sinon.stub();
    driverStub.quit = sinon.stub();

    builderStub = sinon.createStubInstance(webdriver.Builder);
    builderStub.forBrowser.returns(builderStub);
    builderStub.usingServer.returns(builderStub);
    builderStub.setControlFlow.returns(builderStub);
    builderStub.build.returns(driverStub);

    sinon.stub(webdriver, 'Builder').returns(builderStub);
  });

  afterEach(() => {
    webdriver.Builder.restore();
    builderStub = null;
    driverStub = null;
  });

  describe('#run', () => {
    context('when multiple URIs are specified', () => {
      const options = {
        browser: 'browser',
        concurrency: 1,
        server: 'server',
        uris: ['uri1', 'uri2', 'uri3', 'uri4']
      };

      let promise;

      beforeEach(() => {
        driverStub.executeScript
          .returns(webdriver.promise.Promise.resolve(1));
        promise = new ScriptRunner(options).run('script');
      });

      afterEach(() => {
        promise = null;
      });

      it('should get results as many as URIs', (done) => {
        promise
          .then((results) => {
            expect(results).to.have.lengthOf(options.uris.length);
          })
          .then(done);
      });
    });

    context('when driver.executeScript() returns a result', () => {
      const options = {
        browser: 'browser',
        concurrency: 1,
        server: 'server',
        uris: ['uri']
      };

      let promise;

      beforeEach(() => {
        driverStub.executeScript
          .returns(webdriver.promise.Promise.resolve(1));
        promise = new ScriptRunner(options).run('script');
      });

      afterEach(() => {
        promise = null;
      });

      it('should call driver.quit()', (done) => {
        promise
          .then((results) => {
            expect(driverStub.quit).to.have.been.calledOnce;
          })
          .then(done);
      });

      it('should set the result', (done) => {
        promise
          .then((results) => {
            expect(results[0].result).to.exist;
            expect(results[0].error).to.not.exist;
          })
          .then(done);
      });
    });

    context('when driver.executeScript() throws an error', () => {
      const options = {
        browser: 'browser',
        concurrency: 1,
        server: 'server',
        uris: ['uri']
      };

      let promise;

      beforeEach(() => {
        driverStub.executeScript.throws(new Error);
        promise = new ScriptRunner(options).run('script');
      });

      afterEach(() => {
        promise = null;
      });

      it('should call driver.quit()', (done) => {
        promise
          .then((results) => {
            expect(driverStub.quit).to.have.been.calledOnce;
          })
          .then(done);
      });

      it('should set the error', (done) => {
        promise
          .then((results) => {
            expect(results[0].result).to.not.exist;
            expect(results[0].error).to.exist;
          })
          .then(done);
      });
    });

    context('when driver.get() throws an error', () => {
      const options = {
        browser: 'browser',
        concurrency: 1,
        server: 'server',
        uris: ['uri']
      };

      let promise;

      beforeEach(() => {
        driverStub.get.throws(new Error);
        promise = new ScriptRunner(options).run('script');
      });

      afterEach(() => {
        promise = null;
      });

      it('should call driver.quit()', (done) => {
        promise
          .then((results) => {
            expect(driverStub.quit).to.have.been.calledOnce;
          })
          .then(done);
      });

      it('should not call driver.executeScript()', (done) => {
        promise
          .then((results) => {
            expect(driverStub.executeScript).to.have.not.been.called;
          })
          .then(done);
      });

      it('should set the error', (done) => {
        promise
          .then((results) => {
            expect(results[0].result).to.not.exist;
            expect(results[0].error).to.exist;
          })
          .then(done);
      });
    });
  });

  describe('#abort', () => {
    const options = {
      browser: 'browser',
      concurrency: 1,
      server: 'server',
      uris: ['uri1', 'uri2']
    };

    let runner = null;

    beforeEach(() => {
      runner = new ScriptRunner(options);
    });

    afterEach(() => {
      runner = null;
    });

    context('when it is called before running script', () => {
      let promise = null;

      beforeEach(() => {
        promise = runner.run('script');
        runner.abort();
      });

      afterEach(() => {
        promise = null;
      });

      it('should abort the all promises', (done) => {
        promise
          .then((results) => {
            _.each(results, (result) => {
              expect(result).to.not.have.property('result');
              expect(result).to.have.property('error');
            });
          })
          .then(done);
      });
    });

    context('when it is called after running script', () => {
      let promise = null;

      beforeEach(() => {
        driverStub.executeScript = () => runner.abort();
        promise = runner.run('script');
      });

      afterEach(() => {
        promise = null;
      });

      it('should abort the remaining promises', (done) => {
        promise
          .then((results) => {
            expect(results[0]).to.have.property('result');
            expect(results[0]).to.not.have.property('error');
            expect(results[1]).to.not.have.property('result');
            expect(results[1]).to.have.property('error');
          })
          .then(done);
      });
    });
  });
});
