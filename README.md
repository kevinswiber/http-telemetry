# http-telemetry

Intercept HTTP telemetry signals from any Node.js code that's using the built-in http/https modules.

## Install

```
npm install http-telemetry
```

## Usage

Create a file to auto-instrument the built-in http/https modules. Assign an exporter to receive signals from the `ClientRequest`. Exporters must adhere to the `IExporter` interface. See `src/exporters/har-exporter.ts` as an example.

```js
const { HARExporter } = require("../");
const { patch } = require("../");

const name = process.env.HAR_CREATOR_NAME || "har-tracer";
const version = process.env.HAR_CREATOR_VERSION || "1.0.0";
const exportPath = process.env.HAR_EXPORT_PATH || "./trace.har";

const harExporter = new HARExporter({ name, version, exportPath });
patch(harExporter);

process.on(process.report.signal, dump);
process.on("SIGINT", () => {
  dump();
  process.exit();
});
process.on("exit", (code) => {
  if (code !== 0) {
    return;
  }

  dump();
});

function dump() {
  harExporter.complete();
}
```

The instrumentation can either be manually imported into the application or it can be instrumented using the `--require` flag of the `node` executable.

```
node --require ./trace-to-har.js ./client.js
```

When running the example included in the source repository, be sure to look for the output of the included exporter, a `trace.har` file.

## License

Apache-2.0
