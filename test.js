//
// Copyright (c) 2016 Masayuki Nagamachi <masayuki.nagamachi@gmail.com>
//
// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

const chai = require('chai');
const sinon = require('sinon');
const webdriver = require('selenium-webdriver');

const expect = chai.expect;
chai.use(require('sinon-chai'));

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
    driverStub = sinon.createStubInstance(webdriver.WebDriver);
    driverStub.get.returns(webdriver.promise.Promise.resolve());

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
        driverStub.executeScript.restore();
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
        driverStub.executeScript.restore();
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
        driverStub.executeScript
          .throws(new Error);
        promise = new ScriptRunner(options).run('script');
      });

      afterEach(() => {
        promise = null;
        driverStub.executeScript.restore();
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
        driverStub.get
          .returns(webdriver.promise.rejected(new Error));
        promise = new ScriptRunner(options).run('script');
      });

      afterEach(() => {
        promise = null;
        driverStub.get.restore();
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
});
