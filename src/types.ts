import { ClientRequest, IncomingMessage } from "node:http";
import { RequestOptions } from "node:https";
import { Socket } from "node:net";

export interface IExporter {
  onInstrumented(): void;
  createInterceptor(method: string, url: URL, time: bigint): IInterceptor;
  export(): void;
}

export interface IInterceptor {
  onComplete(): void;
  onRequestCall(req: ClientRequest, time: bigint): void;
  onRequestFinish(req: ClientRequest, body: Buffer, time: bigint): void;
  onRequestFirstByte(time: bigint): void;
  onResponseEnd(res: IncomingMessage, body: Buffer, time: bigint): void;
  onResponseFirstByte(time: bigint): void;
  onResponseReceived(res: IncomingMessage, time: bigint): void;
  onSecureConnect(socket: Socket, time: bigint): void;
  onSocketConnect(socket: Socket, time: bigint): void;
  onSocketCreate(socket: Socket, time: bigint): void;
  onDNSLookup(address: string, time: bigint): void;
}

export type TraceOptions = RequestOptions & {
  defaultProtocol: string;
};

export interface ProtocolModule {
  globalAgent: {
    protocol: string;
  };
  request: RequestFunc;
  get: RequestFunc;
}

export type RequestFunc = RequestFunc1 | RequestFunc2;
type RequestFunc1 = (
  options: RequestOptions | string | URL,
  callback?: (res: IncomingMessage) => void
) => ClientRequest;
type RequestFunc2 = (
  url: string | URL,
  options: RequestOptions,
  callback?: (res: IncomingMessage) => void
) => ClientRequest;

export interface Metrics {
  start: bigint;
  blocked: bigint;
  dns: bigint;
  connect: bigint;
  send: bigint;
  wait: bigint;
  receive: bigint;
  ssl: bigint;
}
