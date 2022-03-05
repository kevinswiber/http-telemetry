import { Metrics } from "./types";

export class Meter {
  private startTime: bigint;
  private accumulatedTime: bigint;
  private timings: Metrics;

  constructor(time: bigint) {
    this.startTime = this.accumulatedTime = time;
    this.timings = {
      start: time,
      blocked: 0n,
      dns: 0n,
      connect: 0n,
      send: 0n,
      wait: 0n,
      receive: 0n,
      ssl: 0n,
    };
  }

  get start() {
    return this.startTime;
  }

  recordBlocked(time: bigint) {
    this.timings.blocked = time - this.accumulatedTime;
    this.accumulatedTime = time;
  }

  get blocked() {
    return this.timings.blocked;
  }

  recordDNS(time: bigint) {
    this.timings.dns = time - this.accumulatedTime;
    this.accumulatedTime = time;
  }

  get dns() {
    return this.timings.dns;
  }

  recordConnect(time: bigint) {
    this.timings.connect = time - this.accumulatedTime;
    this.accumulatedTime = time;
  }

  get connect() {
    return this.timings.connect;
  }

  recordSend(time: bigint) {
    this.timings.send = time - this.accumulatedTime;
    this.accumulatedTime = time;
  }

  get send() {
    return this.timings.send;
  }

  recordWait(time: bigint) {
    this.timings.wait = time - this.accumulatedTime;
    this.accumulatedTime = time;
  }

  get wait(): bigint {
    return this.timings.wait;
  }

  recordReceive(time: bigint) {
    this.timings.receive = time - this.accumulatedTime;
    this.accumulatedTime = time;
  }

  get receive(): bigint {
    return this.timings.receive;
  }

  recordSSL(time: bigint) {
    this.timings.ssl = time - this.accumulatedTime;
    this.accumulatedTime = time;
  }

  get ssl(): bigint {
    return this.timings.ssl;
  }

  get total() {
    return this.accumulatedTime - this.startTime;
  }
}
