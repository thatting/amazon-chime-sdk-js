import PingPong from '../pingpong/PingPong';
import PingPongObserver from "../pingpongobserver/PingPongObserver";

export default class IdleMonitor implements PingPongObserver{
    private pingPong: PingPong;
    private canReceivePongs: boolean = false;
    private lastPongResponseSeen: number = 0;
    constructor(private maxIdleTimeMs: number){
      const GlobalAny = global as any;
      GlobalAny['window'] &&
      GlobalAny['window']['addEventListener'] &&
      window.addEventListener('unload', () => {
        this.stop();
      });
    }

    addPingPongObserver(pingPong: PingPong){
      this.pingPong = pingPong;
      this.pingPong.addObserver(this);
    }

    stop() : void {
      this.canReceivePongs = false;
      this.pingPong.removeObserver(this);
    }

    private timeSinceLastActiveMs(): number {
      if (!this.canReceivePongs) {
        return this.maxIdleTimeMs;
      }
      return Date.now() - this.lastPongResponseSeen;
    }

    isIdle(): boolean{
      return this.timeSinceLastActiveMs() >= this.maxIdleTimeMs;
    }

    didReceivePong(_id: number, _latencyMs: number, _clockSkewMs: number): void {
      this.lastPongResponseSeen = Date.now();
      this.canReceivePongs = true;
    }
}