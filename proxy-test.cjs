const https = require("https");
const { HttpsProxyAgent } = require("https-proxy-agent");

const user = encodeURIComponent(process.env.IVY_PROXY_USER);
const pass = encodeURIComponent(process.env.IVY_PROXY_PASS);

const proxyUrl = `http://${user}:${pass}@172.31.102.29:3128`;
const agent = new HttpsProxyAgent(proxyUrl);

https.get("https://solve.ivy.homes/health", { agent }, (res) => {
  let data = "";

  res.on("data", chunk => data += chunk);

  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
  });
}).on("error", (err) => {
  console.error("Proxy test failed:", err.message);
});
