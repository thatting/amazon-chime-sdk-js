// Copyright 2019-2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';

import FullJitterBackoff from '../../src/backoff/FullJitterBackoff';
import PingPong from '../../src/pingpong/PingPong';
import PingPongObserver from '../../src/pingpongobserver/PingPongObserver';
import DefaultReconnectController from '../../src/reconnectcontroller/DefaultReconnectController';
import TimeoutScheduler from '../../src/scheduler/TimeoutScheduler';
import IdleMonitor from "../../src/idlemonitor/IdleMonitor";

describe('DefaultReconnectController', () => {
  let expect: Chai.ExpectStatic;
  let timeout: number;
  let defaultController = (): DefaultReconnectController => {
    return new DefaultReconnectController(50, new FullJitterBackoff(10, 0, 0));
  };

  class TestIdleMonitor extends IdleMonitor implements PingPongObserver {
    constructor(_maxIdleTimeMs: number){
      super(_maxIdleTimeMs);
    }
    isIdle(): boolean{
      return false;
      }
    addPingPongObserver(pingPong: PingPong){}
    didReceivePong(_id: number, _latencyMs: number, _clockSkewMs: number): void {}
  }

  beforeEach(() => {
    expect = chai.expect;
    timeout = 50;
  });

  it('can be constructed', () => {
    expect(defaultController).to.not.equal(null);
  });

  describe('clone', () => {
    it('can be cloned', () => {
      const original = defaultController();
      const cloned = original.clone();
      expect(cloned).to.not.equal(null);
      expect(cloned).to.not.equal(original);
    });
  });

  describe('enableRestartPeerConnection', () => {
    it('should enable only restart peer connection', () => {
      const controller = defaultController();
      expect(controller.shouldOnlyRestartPeerConnection()).to.equal(false);
      controller.enableRestartPeerConnection();
      expect(controller.shouldOnlyRestartPeerConnection()).to.equal(true);
    });
  });

  describe('retryWithBackoff', () => {
    const controller = defaultController();
    it('calls the retry func', done => {
      controller.startedConnectionAttempt(true, new TestIdleMonitor(50));
      expect(
          controller.retryWithBackoff(
          () => {
            done();
          },
          () => {}
        )
      ).to.equal(true);
    });

    it('calls the cancel func if canceled after starting retry', done => {
      const controller = defaultController();
      controller.startedConnectionAttempt(false, new TestIdleMonitor(50));
      expect(
        controller.retryWithBackoff(
          () => {},
          () => {
            new TimeoutScheduler(timeout).start(() => {
              done();
            });
          }
        )
      ).to.equal(true);
      controller.cancel();
      controller.cancel(); // this shouldn't trigger backoffCancel again
    });

    it('does not call the retry func if reconnect is disabled', done => {
      const controller = defaultController();
      controller.disableReconnect();
      expect(
        controller.retryWithBackoff(
          () => {},
          () => {}
        )
      ).to.equal(false);
      new TimeoutScheduler(timeout).start(() => {
        done();
      });
    });

    it('does not call  the retry func', done => {
      controller.startedConnectionAttempt(false, new TestIdleMonitor(50));
      controller.reset();
      expect(controller.hasStartedConnectionAttempt()).to.equal(false);
      expect(controller.isFirstConnection()).to.equal(false);
      expect(
          controller.retryWithBackoff(
              () => {
                done();
              },
              () => {}
          )
      ).to.equal(true);
    });

    it('stops calling the retry func if it is past the deadline', done => {
      const controller = defaultController();
      controller.startedConnectionAttempt(true, new TestIdleMonitor(10));
      expect(controller.hasStartedConnectionAttempt()).to.equal(true);
      expect(controller.isFirstConnection()).to.equal(true);
      const tryAgain = (): void => {
        controller.retryWithBackoff(
          () => {},
          () => {}
        )
          ? new TimeoutScheduler(10).start(() => {
              tryAgain();
            })
          : done();
      };
      tryAgain();
      new TimeoutScheduler(2 * timeout).start(() => {});
      controller.startedConnectionAttempt(false, new TestIdleMonitor(50));
      expect(controller.isFirstConnection()).to.equal(false);
    });

    it('stops calling the retry func if it is past the deadline', done => {
      const controller = defaultController();
      controller.startedConnectionAttempt(true, new TestIdleMonitor(50));
      expect(controller.hasStartedConnectionAttempt()).to.equal(true);
      expect(controller.isFirstConnection()).to.equal(true);
      const tryAgain = (): void => {
        controller.retryWithBackoff(
          () => {},
          () => {}
        )
          ? new TimeoutScheduler(10).start(() => {
              tryAgain();
            })
          : done();
      };
      tryAgain();
      new TimeoutScheduler(2 * timeout).start(() => {});
      controller.startedConnectionAttempt(false, new TestIdleMonitor(50));
      expect(controller.isFirstConnection()).to.equal(false);
    });
  });
});
