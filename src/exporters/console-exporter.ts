// import { ClientRequest, IncomingMessage } from "http";
// import { Socket } from "net";
// import { IExporter, IInterceptor } from "src/types";

// const log = console.log;
// export class ConsoleExporter implements IExporter {
//   onInstrumented(): void {
//     log("Waiting for HTTP requests...")
//   }
//   createInterceptor(method: string, url: URL, time: bigint): IInterceptor {
//     throw new Error("Method not implemented.");
//   }
//   export(): void {
//     throw new Error("Method not implemented.");
//   }
// }

// export class ConsoleInterceptor implements IInterceptor {
//   onComplete(): void {
//     throw new Error("Method not implemented.");
//   }
//   onRequestCall(req: ClientRequest, time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onRequestFinish(req: ClientRequest, body: Buffer, time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onRequestFirstByte(time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onResponseEnd(res: IncomingMessage, body: Buffer, time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onResponseFirstByte(time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onResponseReceived(res: IncomingMessage, time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onSecureConnect(socket: Socket, time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onSocketConnect(socket: Socket, time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onSocketCreate(socket: Socket, time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
//   onDNSLookup(address: string, time: bigint): void {
//     throw new Error("Method not implemented.");
//   }
// }
