import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Har } from "har-format";
import { HARExporter } from "../src";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";

jest.mock("fs");

const exportPath = path.join(os.tmpdir(), "har-exporter");
describe("HAR Exporter", () => {
  test("successfully exports a file", async () => {
    jest.spyOn(fs, "writeFileSync").mockImplementation((_path, contents) => {
      const archive: Har = JSON.parse(contents.toString());

      const creator = archive?.log?.creator;
      expect(creator.name).toBe("test");
      expect(creator.version).toBe("1.0.0");

      expect(archive.log.entries).toHaveLength(1);

      const request = archive?.log?.entries[0]?.request;
      expect(request.method).toBe("GET");
      expect(request.url).toBe("https://example.org/");
    });

    const exporter = new HARExporter({
      name: "test",
      version: "1.0.0",
      exportPath,
    });

    const interceptor = exporter.next(
      "GET",
      new URL("https://example.org"),
      process.hrtime.bigint()
    );

    const message = new IncomingMessage(new Socket());
    interceptor.onResponseEnd(
      message,
      Buffer.alloc(0),
      process.hrtime.bigint()
    );
    exporter.complete();

    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
