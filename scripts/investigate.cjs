const https = require("https");
const { HttpsProxyAgent } = require("https-proxy-agent");
const fs = require("fs");

const API_KEY = process.env.IVY_API_KEY;
const TOKEN = process.env.IVY_TOKEN;
const PROXY_USER = process.env.IVY_PROXY_USER;
const PROXY_PASS = process.env.IVY_PROXY_PASS;

if (!API_KEY || !TOKEN) {
  throw new Error("IVY_API_KEY or IVY_TOKEN is missing.");
}

if (!PROXY_USER || !PROXY_PASS) {
  throw new Error("IVY_PROXY_USER or IVY_PROXY_PASS is missing.");
}

const proxyUser = encodeURIComponent(PROXY_USER);
const proxyPass = encodeURIComponent(PROXY_PASS);

const proxyUrl = `http://${proxyUser}:${proxyPass}@172.31.102.29:3128`;
const agent = new HttpsProxyAgent(proxyUrl);

function getListings(offset) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "solve.ivy.homes",
      path: `/v1/listings?limit=50&offset=${offset}`,
      method: "GET",
      agent,
      headers: {
        "X-API-Key": API_KEY,
        "Authorization": `Bearer ${TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const json = JSON.parse(data);

          if (res.statusCode !== 200) {
            reject(
              new Error(
                `API returned status ${res.statusCode}: ${JSON.stringify(json)}`
              )
            );
            return;
          }

          resolve(json);
        } catch (error) {
          reject(new Error("Could not parse response: " + error.message));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const allListings = [];
  let offset = 0;
  let total = null;

  while (true) {
    console.log(`Fetching offset ${offset} through college proxy...`);

    const response = await getListings(offset);

    if (!Array.isArray(response.results)) {
      throw new Error("Expected response.results to be an array.");
    }

    if (total === null) {
      total = response.total;
      console.log(`API reports total listings: ${total}`);
    }

    console.log(`Received ${response.results.length} listings`);

    allListings.push(...response.results);

    if (!response.has_more) {
      break;
    }

    offset += response.limit;
  }

  fs.writeFileSync(
    "listings.json",
    JSON.stringify(allListings, null, 2)
  );

  console.log("");
  console.log("=================================");
  console.log("DONE");
  console.log(`API total: ${total}`);
  console.log(`Downloaded: ${allListings.length}`);
  console.log("Saved to: listings.json");
  console.log("=================================");
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});