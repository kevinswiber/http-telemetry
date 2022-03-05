import fs from "node:fs";
import {
  ClientRequest,
  IncomingHttpHeaders,
  IncomingMessage,
  OutgoingHttpHeaders,
} from "node:http";
import { AddressInfo, Socket } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { Entry, Har } from "har-format";
import { getEncoding } from "istextorbinary";
import { IExporter, IInterceptor } from "../types";
import { Meter } from "../meter";

export interface HARExporterOptions {
  name: string;
  version: string;
  exportPath: string;
}

export class HARExporter implements IExporter {
  private readonly exportPath: string;
  private archive: Har;

  constructor({ name, version, exportPath }: HARExporterOptions) {
    this.exportPath = exportPath;
    this.archive = HARExporter.createArchive(name, version);
  }

  onInstrumented(): void {
    this.archive.log.entries = [];
  }

  next(method: string, url: URL, time: bigint): IInterceptor {
    const interceptor = new HARInterceptor(method, url, time, (entry) => {
      this.archive.log.entries.push(entry);
    });
    return interceptor;
  }

  complete(): void {
    const contents = JSON.stringify(this.archive, null, 2);
    fs.writeFileSync(this.exportPath, contents);
  }

  private static createArchive(name: string, version: string): Har {
    return {
      log: {
        version: "1.2",
        creator: {
          name,
          version,
        },
        pages: [],
        entries: [],
      },
    };
  }
}

class HARInterceptor implements IInterceptor {
  private url: URL;
  private entry: Entry;
  private meter: Meter;
  private successHandler: (entry: Entry) => void;

  constructor(
    method: string,
    url: URL,
    time: bigint,
    successHandler: (entry: Entry) => void
  ) {
    this.url = url;
    this.entry = this.createEntry(method, url, new Date());
    this.meter = new Meter(time);
    this.successHandler = successHandler;
  }

  onRequestAbort(_req: ClientRequest, _time: bigint): void {
    // no-op
  }

  onRequestClose(_req: ClientRequest, _time: bigint): void {
    // no-op
  }

  onRequestError(_req: ClientRequest, _error: Error, _time: bigint): void {
    // no-op
  }

  onResponseAborted(_res: IncomingMessage, _time: bigint): void {
    // no-op
  }

  onResponseError(_res: IncomingMessage, _error: Error, _time: bigint): void {
    // no-op
  }

  onResponseClose(_res: IncomingMessage, _time: bigint): void {
    // no-op
  }

  onRequestCall(req: ClientRequest, _time: bigint): void {
    const { converted, size } = this.convertHeadersWithSize(req.getHeaders());
    this.entry.request.headers = converted;
    this.entry.request.headersSize = size;

    for (const [name, value] of this.url.searchParams.entries()) {
      this.entry.request.queryString.push({ name, value });
    }

    this.entry.request.cookies = !req.getHeader("cookie")
      ? []
      : (req.getHeader("cookie") as string).split("; ").map((cookie) => {
          const [name, value] = cookie.split("=");
          return { name, value };
        });
  }

  onResponseReceived(res: IncomingMessage, _time: bigint): void {
    this.entry.response.status = res.statusCode;
    this.entry.response.statusText = res.statusMessage;
    this.entry.response.httpVersion = `HTTP/${res.httpVersion}`;
    this.entry.response.redirectURL = res.headers["location"] || "";
    this.entry.response.content.mimeType = res.headers["content-type"];

    const { converted, size } = this.convertHeadersWithSize(res.headers);
    this.entry.response.headers = converted;
    this.entry.response.headersSize = size;

    this.entry.response.cookies = !res.headers["cookie"]
      ? []
      : res.headers["set-cookie"].map((cookie) => {
          const cookieObj = {
            name: "",
            value: "",
            path: undefined,
            domain: undefined,
            expires: undefined,
            httpOnly: undefined,
            secure: undefined,
          };
          // fragile, cookies can contain semicolons in quoted values
          const parts = cookie.split(";");
          const [cookieName, cookieValue] = parts.shift().split("=");
          cookieObj.name = cookieName;
          cookieObj.value = cookieValue;

          for (const attr of parts) {
            const attrParts = attr.split("=");
            const attrName = attrParts[0].trim().toLowerCase();
            const attrValue = attrParts[1];
            switch (attrName) {
              case "path":
                cookieObj.path = attrValue;
                break;
              case "domain":
                cookieObj.domain = attrValue;
                break;
              case "expires":
                cookieObj.expires = attrValue;
                break;
              case "httponly":
                cookieObj.httpOnly = true;
                break;
              case "secure":
                cookieObj.secure = true;
            }
          }

          return cookieObj;
        });
  }

  onResponseFirstByte(res: IncomingMessage, time: bigint): void {
    this.meter.recordWait(time);
    this.entry.timings.wait = Number(this.meter.wait) / 1_000_000;
  }

  onResponseEnd(res: IncomingMessage, body: Buffer, time: bigint): void {
    this.meter.recordReceive(time);
    this.entry.timings.receive = Number(this.meter.receive) / 1_000_000;
    this.entry.time = Number(this.meter.total) / 1_000_000;

    this.entry.response.bodySize = body.length;
    const ce = res.headers["content-encoding"];
    if (!ce) {
      this.entry.response.content.size = body.length; // only if not compressed, bigger uncompressed

      const enc = getEncoding(body);

      if (!enc) {
        return;
      } else if (enc === "utf8") {
        this.entry.response.content.text = body.toString("utf8");
      } else if (enc === "binary") {
        this.entry.response.content.text = body.toString("base64");
        this.entry.response.content.encoding = "base64";
      }
    } else {
      const decompress = new Map([
        ["gzip", createGunzip],
        ["br", createBrotliDecompress],
        ["deflate", createInflate],
      ]);
      if (decompress.has(ce)) {
        const deFunc = decompress.get(ce);
        const de = deFunc();
        de.end(body);

        const chunks = [];
        de.on("readable", () => {
          let chunk: Buffer;
          while ((chunk = de.read())) {
            chunks.push(chunk);
          }
        });
        de.on("end", () => {
          const buf = Buffer.concat(chunks);
          this.entry.response.content.size = buf.length;
          this.entry.response.content.compression = buf.length - body.length;

          const enc = getEncoding(buf);

          if (!enc) {
            return;
          } else if (enc === "utf8") {
            this.entry.response.content.text = buf.toString("utf8");
          } else if (enc === "binary") {
            this.entry.response.content.text = buf.toString("base64");
            this.entry.response.content.encoding = "base64";
          }
        });
      }
    }

    this.successHandler(this.entry);
  }

  onRequestFirstByte(_req: ClientRequest, _time: bigint): void {
    // no-op
  }

  onRequestFinish(req: ClientRequest, body: Buffer, time: bigint): void {
    this.meter.recordSend(time);
    this.entry.timings.send = Number(this.meter.send) / 1_000_000;

    this.entry.request.bodySize = body.length;

    const ct = req.getHeader("content-type");
    if (ct) {
      this.entry.request.postData.mimeType = ct as string;
      if (ct === "application/x-wwww-form-urlencoded") {
        const params = new URLSearchParams(body.toString("utf8"));
        this.entry.request.postData.params = [];
        for (const [name, value] of params.entries()) {
          this.entry.request.postData.params.push({ name, value });
        }
      }
      if (ct === "multipart/form-data") {
        this.entry.request.postData.params = []; // TODO ...or no?
      }

      if (getEncoding(body) === "utf8") {
        this.entry.request.postData.text = body.toString("utf8");
      }
    }
  }

  onSocketAssigned(socket: Socket, time: bigint): void {
    this.meter.recordBlocked(time);
    this.entry.timings.blocked = Number(this.meter.blocked) / 1_000_000;

    const address = socket.address() as AddressInfo;
    if (address.port) {
      this.entry.connection = String(address.port);
    }
  }

  onDNSLookup(_socket: Socket, address: string, time: bigint): void {
    this.entry.serverIPAddress = address;

    this.meter.recordDNS(time);
    this.entry.timings.dns = Number(this.meter.dns) / 1_000_000;
  }

  onSocketConnect(socket: Socket, time: bigint): void {
    const address = socket.address() as AddressInfo;
    if (address.port) {
      this.entry.connection = String(address.port);
    }

    this.meter.recordConnect(time);

    this.entry.timings.connect = Number(this.meter.connect) / 1_000_000;
  }

  onSecureConnect(_socket: Socket, time: bigint): void {
    this.meter.recordSSL(time);
    this.entry.timings.ssl = Number(this.meter.ssl) / 1_000_000;
  }

  private createEntry(method: string, url: URL, start: Date): Entry {
    const entry = {
      startedDateTime: null,
      time: 0,
      serverIPAddress: "",
      connection: "",
      request: {
        method: "GET",
        url: "",
        httpVersion: "HTTP/1.1",
        cookies: [],
        headers: [],
        queryString: [],
        postData: undefined,
        headersSize: -1,
        bodySize: -1,
      },
      response: {
        status: 0,
        statusText: "",
        httpVersion: "HTTP/1.1",
        cookies: [],
        headers: [],
        content: {
          size: 0,
          mimeType: "",
        },
        redirectURL: "",
        headersSize: -1,
        bodySize: -1,
      },
      cache: {
        beforeRequest: null,
        afterRequest: null,
      },
      timings: {
        blocked: -1,
        dns: -1,
        connect: -1,
        send: 0,
        wait: 0,
        receive: 0,
        ssl: -1,
      },
    };

    entry.startedDateTime = start.toISOString();
    entry.request.method = method;
    entry.request.url = url.toString();

    return entry;
  }

  private convertHeadersWithSize(
    headers: IncomingHttpHeaders | OutgoingHttpHeaders
  ) {
    return Object.entries(headers).reduce(
      (prev, [name, value]) => {
        if (Array.isArray(value)) {
          prev.size +=
            name.length * value.length +
            value.join("").length +
            4 * value.length;
          for (const val of value) {
            prev.converted.push({ name, value: String(val) });
          }
        }

        prev.size += name.length + 4 + String(value).length;
        prev.converted.push({ name, value: String(value) });

        return prev;
      },
      {
        converted: [],
        size: 2,
      }
    );
  }
}
