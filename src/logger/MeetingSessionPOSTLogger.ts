import Logger from '../logger/Logger';
import LogLevel from '../logger/LogLevel';
import IntervalScheduler from '../scheduler/IntervalScheduler';
import MeetingSessionConfiguration from '../meetingsession/MeetingSessionConfiguration';
import MeetingLog from "./MeetingLog";

export default class MeetingSessionPOSTLogger implements Logger {
  private logCapture: MeetingLog[] = [];
  private sequenceNumber: number = 0;
  private lock = false;
  private intervalScheduler: IntervalScheduler;

  constructor(
      private name: string,
      private configuration: MeetingSessionConfiguration,
      private batchSize: number,
      private intervalMs: number,
      private url: string,
      private level = LogLevel.WARN,
  ) {
    this.intervalScheduler = new IntervalScheduler(this.intervalMs);
    this.startLogPublishScheduler(this.batchSize);
    const GlobalAny = global as any;
    GlobalAny['window'] &&
    GlobalAny['window']['addEventListener'] &&
    window.addEventListener('unload', () => {
      this.stop();
    });
  }

  debug(debugFunction: () => string): void {
    if (LogLevel.DEBUG < this.level) {
      return;
    }
    this.log(LogLevel.DEBUG, debugFunction());
  }

  info(msg: string): void {
    this.log(LogLevel.INFO, msg);
  }

  warn(msg: string): void {
    this.log(LogLevel.WARN, msg);
  }

  error(msg: string): void {
    this.log(LogLevel.ERROR, msg);
  }

  setLogLevel(level: LogLevel): void {
    this.level = level;
  }

  getLogLevel(): LogLevel {
    return this.level;
  }

  getLogCaptureSize() : number {
    return this.logCapture.length;
  }

  startLogPublishScheduler(batchSize: number): void {
    this.intervalScheduler.start(async () => {
      if (this.lock === true || this.getLogCaptureSize() === 0) {
        return;
      }
      this.lock = true;
      const batch = this.logCapture.slice(0, batchSize);
      console.log(batch);

      const body = this.makeRequestBody(batch);
      try {
        const response = await fetch(this.url, {
          method: 'POST',
          body,
        });
        if (response.status === 200) {
          this.logCapture = this.logCapture.slice(batch.length);
        }
      } catch (error) {
        console.warn('[MeetingSessionPOSTLogger] ' + error.message);
      } finally {
        this.lock = false;
      }
    });
  }

  stop(){
    this.intervalScheduler.stop();
    const body = this.makeRequestBody(this.logCapture);
    const GlobalAny = global as any;
    GlobalAny['window'] &&
    GlobalAny['window']['addEventListener'] &&
    navigator.sendBeacon(this.url, body);
  }

  private makeRequestBody(batch: MeetingLog[]) : string {
    return JSON.stringify({
      meetingId: this.configuration.meetingId,
      attendeeId: this.configuration.credentials.attendeeId,
      appName: this.name,
      logs: batch,
    });
  }

  private log(type: LogLevel, msg: string): void {
    if (type < this.level) {
      return;
    }
    const date = new Date();
    this.logCapture.push(new MeetingLog(
        this.sequenceNumber,
        msg,
        date.getTime(),
        LogLevel[type]
    ));
    this.sequenceNumber += 1;
  }
}