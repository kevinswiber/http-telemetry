import { ClientRequest, IncomingMessage } from "node:http";
import { IExporter, RequestFunc, TraceOptions } from "./types";

export function instrument(
  self: unknown,
  exporter: IExporter,
  request: RequestFunc,
  options: TraceOptions,
  defaultProtocol: string,
  callback?: (res: IncomingMessage) => void
) {
  const method = options.method || "GET";
  const url =
    typeof options === "string"
      ? new URL(String(options))
      : new URL(
          (options.protocol || defaultProtocol) +
            "//" +
            (options.hostname || options.host || "localhost") +
            ":" +
            (options.port || "80") +
            (options.path || "/")
        );

  const interceptor = exporter.next(method, url, process.hrtime.bigint());

  const req: ClientRequest = request.call(self, options, callback);
  interceptor.onRequestCall(req, process.hrtime.bigint());

  req.on("response", (res: IncomingMessage) => {
    interceptor.onResponseReceived(res, process.hrtime.bigint());

    res.once("data", () => {
      interceptor.onResponseFirstByte(res, process.hrtime.bigint());
    });

    const chunks: Buffer[] = [];
    res.on("data", (chunk) => {
      chunks.push(chunk);
    });

    res.on("end", () => {
      const responseBody = Buffer.concat(chunks);
      interceptor.onResponseEnd(res, responseBody, process.hrtime.bigint());
    });

    res.on("close", () => {
      interceptor.onResponseClose(res, process.hrtime.bigint());
    });

    res.on("error", (err) => {
      interceptor.onResponseError(res, err, process.hrtime.bigint());
    });

    res.on("aborted", () => {
      interceptor.onResponseAborted(res, process.hrtime.bigint());
    });
  });

  req.once("data", () => {
    interceptor.onRequestFirstByte(req, process.hrtime.bigint());
  });

  const chunks: Buffer[] = [];
  req.on("data", (chunk) => {
    chunks.push(chunk);
  });

  req.on("finish", () => {
    const requestBody = Buffer.concat(chunks);
    interceptor.onRequestFinish(req, requestBody, process.hrtime.bigint());
  });

  req.on("close", () => {
    interceptor.onRequestClose(req, process.hrtime.bigint());
  });

  req.on("error", (err) => {
    interceptor.onRequestError(req, err, process.hrtime.bigint());
  });

  req.on("abort", () => {
    interceptor.onRequestAbort(req, process.hrtime.bigint());
  });

  req.on("socket", (socket) => {
    interceptor.onSocketAssigned(socket, process.hrtime.bigint());

    if (!socket.connecting) {
      return;
    }

    socket.on("lookup", (_err, address) => {
      interceptor.onDNSLookup(socket, address, process.hrtime.bigint());
    });

    socket.on("connect", () => {
      interceptor.onSocketConnect(socket, process.hrtime.bigint());
    });

    socket.on("secureConnect", () => {
      interceptor.onSecureConnect(socket, process.hrtime.bigint());
    });
  });

  return req;
}
