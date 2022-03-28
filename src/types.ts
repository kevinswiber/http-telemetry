import { ClientRequest, IncomingMessage } from "node:http";
import { RequestOptions } from "node:https";
import { Socket } from "node:net";

export interface IClientExporter {
  onInstrumented(): void;
  next(method: string, url: URL, time: bigint): IClientInterceptor;
  complete(): void;
}

export interface IClientInterceptor {
  onDNSLookup(socket: Socket, address: string, time: bigint): void;
  onRequestAbort(req: ClientRequest, time: bigint): void;
  onRequestCall(req: ClientRequest, time: bigint): void;
  onRequestClose(req: ClientRequest, time: bigint): void;
  onRequestError(req: ClientRequest, error: Error, time: bigint): void;
  onRequestFinish(req: ClientRequest, body: Buffer, time: bigint): void;
  onRequestFirstByte(req: ClientRequest, time: bigint): void;
  onResponseAborted(res: IncomingMessage, time: bigint): void;
  onResponseClose(res: IncomingMessage, time: bigint): void;
  onResponseEnd(res: IncomingMessage, body: Buffer, time: bigint): void;
  onResponseError(res: IncomingMessage, error: Error, time: bigint): void;
  onResponseFirstByte(res: IncomingMessage, time: bigint): void;
  onResponseReceived(res: IncomingMessage, time: bigint): void;
  onSecureConnect(socket: Socket, time: bigint): void;
  onSocketConnect(socket: Socket, time: bigint): void;
  onSocketAssigned(socket: Socket, time: bigint): void;
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

export interface Measurements {
  start: bigint;
  blocked: bigint;
  dns: bigint;
  connect: bigint;
  send: bigint;
  wait: bigint;
  receive: bigint;
  ssl: bigint;
}
