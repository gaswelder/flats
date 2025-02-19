import cors from "cors";
import express from "express";
import { log } from "./lib/slog.mjs";
import admin from "./admin/main.mjs";
import adminLogin from "./admin/login.mjs";
import cookieParser from "cookie-parser";

const parseFilter = (req) => {
  const byVal = (a, b) => a - b;
  return {
    maxPrice: parseInt(req.query["max-price"], 10) || 0,
    rooms: (req.query["rooms"] || "")
      .split(",")
      .map((s) => parseInt(s, 10))
      .filter(Boolean),
    lat: req.query["lat"]
      ?.split(",")
      .map((x) => parseFloat(x))
      .sort(byVal),
    lon: req.query["lon"]
      ?.split(",")
      .map((x) => parseFloat(x))
      .sort(byVal),
  };
};

const SECRET = "123123123";
const adminAuth = (req, res, next) => {
  cookieParser()(req, res, () => {
    const token = req.cookies.token;
    if (token != SECRET) {
      res.redirect("admin/login");
      return;
    }
    next();
  });
};

export const createApp = (core) => {
  return express()
    .use((req, res, next) => {
      const t = Date.now();
      res.on("close", () => {
        const duration = Date.now() - t;
        log.info(`${res.statusCode} ${req.url} (${duration} ms)`, {
          duration,
          url: req.url,
          status: res.statusCode,
        });
      });
      next();
    })
    .use(cors())
    .use(express.static("frontend/dist"))
    .get("/admin", adminAuth, async (req, res) => {
      res.send(await admin(core));
    })
    .get("/admin/login", async (req, res) => {
      res.send(await adminLogin());
    })
    .post(
      "/admin/login",
      express.urlencoded({ extended: false }),
      async (req, res) => {
        const login = req.body.login;
        const password = req.body.password;
        if (login == "foo" && password == "bar") {
          res.cookie("token", SECRET, { maxAge: 1000 * 3600 * 24 });
          res.redirect("../admin");
        } else {
          res.send(await adminLogin("wrong login / password"));
        }
      }
    )
    .post(
      "/admin",
      adminAuth,
      express.urlencoded({ extended: false }),
      async (req, res) => {
        const b = req.body;
        await core.addSubscriber(b);
        res.send(`Added subscriber
      <pre>${JSON.stringify(b, null, 2)}</pre>
      <a href="admin">Back to admin</a>
      `);
      }
    )
    .get(
      "/api/offers",
      serveJson(async (req) => {
        const filter = parseFilter(req);
        const offers = await core.getOffers(filter, 5000);
        return {
          offers,
          error:
            offers.length == 5000
              ? "hit results limit, try narrowing the area"
              : null,
        };
      })
    )
    .get(
      `/api/counts`,
      serveJson(async (req) => {
        const filter = parseFilter(req);
        return core.getCounts(filter);
      })
    )
    .get(
      `/api/averages`,
      serveJson(async (req) => {
        const filter = parseFilter(req);
        return core.getAverages(filter);
      })
    )
    .put(
      "/api/snapshots/:id/:ts",
      express.json({ limit: "10MB" }),
      serveJson(async (req) => {
        await core.addSnapshot(req.params.id, req.body, req.params.ts);
        return "ok";
      })
    )
    .post(
      "/api/login",
      express.json(),
      serveJson(async (req) => {
        return core.login(req.body.user, req.body.password);
      })
    );
};

const serveJson = (f) => async (req, res) => {
  try {
    res.json(await f(req));
  } catch (err) {
    log.error(`${req.path}: ${err.message}`, err);
    res.status(500).json({ err });
  }
};
