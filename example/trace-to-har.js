/* eslint-disable @typescript-eslint/no-var-requires */
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
