// Copyright 2019-2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import * as sinon from 'sinon';

import PingPong from '../../src/pingpong/PingPong';
import PingPongObserver from '../../src/pingpongobserver/PingPongObserver';
import IdleMonitor from "../../src/idlemonitor/IdleMonitor";

describe('IdleMonitor', () => {
    let expect: Chai.ExpectStatic;
    let maxIdleTimeMs: number;

    class TestPingPong implements PingPong {
      addObserver(_observer: PingPongObserver): void {}
      removeObserver(_observer: PingPongObserver): void {}
      forEachObserver(_observerFunc: (_observer: PingPongObserver) => void): void {}
      start(): void {}
      stop(): void {}
    }

    beforeEach(() => {
        expect = chai.expect;
        maxIdleTimeMs = 50;
    });

    it('can be constructed', () => {
        const idleMonitor = new IdleMonitor(maxIdleTimeMs);
        expect(idleMonitor).to.not.equal(null);
    });

    it('can add a PingPongObserver', () => {
        const idleMonitor = new IdleMonitor(maxIdleTimeMs);
        const addPingPongObserverSpy = sinon.spy(idleMonitor, 'addPingPongObserver');
        idleMonitor.addPingPongObserver(new TestPingPong);
        expect(addPingPongObserverSpy.called).to.equal(true);
    });

    it('can receive a pong', () => {
        const idleMonitor = new IdleMonitor(maxIdleTimeMs);
        const didReceivePongSpy = sinon.spy(idleMonitor, 'didReceivePong');
        idleMonitor.didReceivePong(0,0, 0);
        expect(didReceivePongSpy.called).to.equal(true);
    });

    it('can stop a PingPong', () => {
        const idleMonitor = new IdleMonitor(maxIdleTimeMs);
        const stopSpy = sinon.spy(idleMonitor, 'stop');
        idleMonitor.addPingPongObserver(new TestPingPong);
        idleMonitor.stop();
        expect(stopSpy.called).to.equal(true);
    });

    it('returns the mazIdleTimeMs when the isIdle is called', () => {
        const idleMonitor = new IdleMonitor(maxIdleTimeMs);
        const isIdleSpy = sinon.spy(idleMonitor, 'isIdle');
        idleMonitor.isIdle();
        expect(isIdleSpy.called).to.equal(true);
    });

    it('returns difference between the current time and the lastPongResponseSeen when the isIdle is called', () => {
        const idleMonitor = new IdleMonitor(maxIdleTimeMs);
        idleMonitor.addPingPongObserver(new TestPingPong);
        idleMonitor.didReceivePong(0,0,0);
        const isIdleSpy = sinon.spy(idleMonitor, 'isIdle');
        idleMonitor.isIdle();
        expect(isIdleSpy.called).to.equal(true);
    });
});
