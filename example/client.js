/* eslint-disable @typescript-eslint/no-var-requires */
const { request } = require("https");

request(
  {
    host: "f0qfne0emk.execute-api.us-west-2.amazonaws.com",
    path: "/prod/tags",
    headers: {
      "Accept-Encoding": "deflate",
    },
  },
  (res) => {
    console.log("status code:", res.statusCode);
  }
).end();
