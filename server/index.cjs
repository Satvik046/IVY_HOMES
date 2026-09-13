require("dotenv").config();

const express = require("express");
const https = require("https");
const { HttpsProxyAgent } = require("https-proxy-agent");

const app = express();

app.use(express.json());

/* =========================
   CORS
========================= */

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});


/* =========================
   CONFIG
========================= */

const PORT = 3001;

const {
  IVY_API_KEY,
  IVY_PROXY_HOST,
  IVY_PROXY_PORT,
  IVY_PROXY_USER,
  IVY_PROXY_PASS,
} = process.env;

const proxyUser = encodeURIComponent(IVY_PROXY_USER);
const proxyPass = encodeURIComponent(IVY_PROXY_PASS);

const proxyUrl =
  `http://${proxyUser}:${proxyPass}` +
  `@${IVY_PROXY_HOST}:${IVY_PROXY_PORT}`;

const proxyAgent = new HttpsProxyAgent(proxyUrl);


/* =========================
   IVY API REQUEST
========================= */

function ivyRequest(path, method = "GET", token = null, body = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      "X-API-Key": IVY_API_KEY,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const request = https.request(
      {
        hostname: "solve.ivy.homes",
        path,
        method,
        agent: proxyAgent,
        headers,
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          let parsed;

          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = {
              raw: data,
            };
          }

          resolve({
            status: response.statusCode,
            data: parsed,
          });
        });
      }
    );

    request.on("error", reject);

    if (body) {
      request.write(JSON.stringify(body));
    }

    request.end();
  });
}


/* =========================
   HEALTH
========================= */

app.get("/api/health", async (req, res) => {
  try {
    const result = await ivyRequest("/health");

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});


/* =========================
   LOGIN
========================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const result = await ivyRequest(
      "/auth/login",
      "POST",
      null,
      {
        email,
        password,
      }
    );

    if (result.status === 200 && result.data.access_token) {
      res.setHeader(
        "Set-Cookie",
        `ivy_token=${result.data.access_token}; HttpOnly; SameSite=Lax; Path=/`
      );

      return res.json({
        user: result.data.user || null,
        expires_in: result.data.expires_in,
      });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});


/* =========================
   PROJECTS
========================= */

app.get("/api/auth/session", async (req, res) => {
  try {
    const token = req.headers.cookie
      ?.split(";")
      .find((cookie) => cookie.trim().startsWith("ivy_token="))
      ?.split("=")[1];

    if (!token) {
      return res.status(401).json({
        error: "Not logged in.",
      });
    }

    const result = await ivyRequest(
      "/v1/listings?limit=1&offset=0",
      "GET",
      token
    );

    if (result.status === 200) {
      return res.json({
        authenticated: true,
      });
    }

    return res.status(401).json({
      error: "Session expired.",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});
app.get("/api/rentals", async (req, res) => {
  try {
    const token = req.headers.cookie
      ?.split(";")
      .find((cookie) => cookie.trim().startsWith("ivy_token="))
      ?.split("=")[1];

    if (!token) {
      return res.status(401).json({
        error: "Not logged in.",
      });
    }

    const query = new URLSearchParams();

    if (req.query.limit) query.set("limit", req.query.limit);
    if (req.query.offset) query.set("offset", req.query.offset);
    if (req.query.locality) query.set("locality", req.query.locality);
    if (req.query.bhk) query.set("bhk", req.query.bhk);
    if (req.query.furnishing) query.set("furnishing", req.query.furnishing);
    if (req.query.sort_by) query.set("sort_by", req.query.sort_by);
    if (req.query.order) query.set("order", req.query.order);

    const queryString = query.toString();

    const path = queryString
      ? `/v1/rentals?${queryString}`
      : "/v1/rentals";

    const result = await ivyRequest(path, "GET", token);

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   ALL PROJECTS
========================= */

app.get("/api/projects/all", async (req, res) => {
  try {
    const token = req.headers.cookie
      ?.split(";")
      .find((cookie) => cookie.trim().startsWith("ivy_token="))
      ?.split("=")[1];

    if (!token) {
      return res.status(401).json({
        error: "Not logged in.",
      });
    }

    const allProjects = [];

    let offset = 0;
    const limit = 20;

    while (true) {
      const result = await ivyRequest(
        `/v1/projects?limit=${limit}&offset=${offset}`,
        "GET",
        token
      );

      if (result.status !== 200) {
        return res.status(result.status).json(result.data);
      }

      const page = result.data;

      if (!Array.isArray(page.results)) {
        return res.status(500).json({
          error: "Unexpected projects response format.",
        });
      }

      allProjects.push(...page.results);

      if (!page.has_more) {
        break;
      }

      offset += page.count;
    }

    res.json({
      total: allProjects.length,
      results: allProjects,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});


/* =========================
   LISTINGS
========================= */

app.get("/api/listings", async (req, res) => {
  try {
    const query = new URLSearchParams();

    if (req.query.limit) {
      query.set("limit", req.query.limit);
    }

    if (req.query.offset) {
      query.set("offset", req.query.offset);
    }

    const queryString = query.toString();

    const path = queryString
      ? `/v1/listings?${queryString}`
      : "/v1/listings";

    const token = req.headers.cookie
      ?.split(";")
      .find((cookie) => cookie.trim().startsWith("ivy_token="))
      ?.split("=")[1];

    if (!token) {
      return res.status(401).json({
        error: "Bearer token is required.",
      });
    }

    const result = await ivyRequest(
      path,
      "GET",
      token
    );

    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});


/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(
    `Backend running at http://localhost:${PORT}`
  );
});