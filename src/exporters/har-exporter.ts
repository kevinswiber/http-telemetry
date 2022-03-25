import fs from "node:fs";
import { Har } from "har-format";
import { IClientExporter, IClientInterceptor } from "../types";
import { HAREntryCollector } from "../collectors/har-entry-collector";

export interface HARExporterOptions {
  name: string;
  version: string;
  exportPath: string;
}

export class HARExporter implements IClientExporter {
  private readonly exportPath: string;
  private archive: Har;

  constructor({ name, version, exportPath }: HARExporterOptions) {
    this.exportPath = exportPath;
    this.archive = HARExporter.createArchive(name, version);
  }

  onInstrumented(): void {
    this.archive.log.entries = [];
  }

  next(method: string, url: URL, time: bigint): IClientInterceptor {
    const interceptor = new HAREntryCollector(method, url, time, (entry) => {
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
