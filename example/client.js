/* eslint-disable @typescript-eslint/no-var-requires */
const { Agent, request } = require("https");

const agent = new Agent({
  keepAlive: true,
  maxSockets: Infinity,
});

const MAX = 3;
let count = 0;
function makeRequest() {
  if (interval && count === MAX) {
    clearInterval(interval);
    return;
  }

  request(
    {
      host: "f0qfne0emk.execute-api.us-west-2.amazonaws.com",
      path: "/prod/tags",
      headers: {
        "Accept-Encoding": "gzip",
        Connection: "keep-alive",
      },
      agent,
    },
    (res) => {
      console.log("status code:", res.statusCode);
      count++;
    }
  ).end();
}

const interval = setInterval(() => makeRequest(), 1000);
