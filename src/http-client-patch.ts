import { IncomingMessage } from "node:http";
import hook from "require-in-the-middle";
import shimmer from "shimmer";
import { instrument } from "./http-client-instrumentation";
import {
  TraceOptions,
  ProtocolModule,
  RequestFunc,
  IClientExporter,
} from "./types";

export function patch(exporter: IClientExporter) {
  hook(["http", "https"], (moduleExports) => {
    const modExp = moduleExports as unknown as ProtocolModule;
    shimmer.wrap(modExp, "request", (request) =>
      createTrace(modExp, exporter, request)
    );
    shimmer.wrap(modExp, "get", (request) =>
      createTrace(modExp, exporter, request)
    );
    exporter.onInstrumented();
    return moduleExports;
  });
}

function createTrace(
  moduleExports: ProtocolModule,
  exporter: IClientExporter,
  request: RequestFunc
) {
  const defaultProtocol = moduleExports.globalAgent?.protocol || "http:";
  return function trace(
    options: TraceOptions,
    callback: (res: IncomingMessage) => void
  ) {
    if (!options) {
      return request.apply(this, [options, callback]);
    }

    return instrument(
      this,
      exporter,
      request,
      options,
      defaultProtocol,
      callback
    );
  };
}
