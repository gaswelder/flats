import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { adminViews } from "./admin/index.mjs";
import { log } from "./lib/slog.mjs";

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

export const createApp = (core) => {
  const adminAuth = (req, res, next) => {
    cookieParser()(req, res, async () => {
      const token = req.cookies.token;
      try {
        if (await core.checkAdminToken(token)) {
          next();
        } else {
          res.redirect("login");
        }
      } catch (err) {
        log.error(`error in adminAuth: ${err.message}`, { err });
        res.sendStatus(500);
      }
    });
  };

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
    .get("/admin", (req, res) => {
      if (req.path.endsWith("/")) {
        res.redirect("updates");
      } else {
        res.redirect("admin/updates");
      }
    })
    .get("/admin/users", adminAuth, async (req, res) => {
      res.send(await adminViews.users(core));
    })
    .get("/admin/updates", adminAuth, async (req, res) => {
      res.send(await adminViews.updates(core));
    })
    .get("/admin/subscriptions", adminAuth, async (req, res) => {
      res.send(await adminViews.subscriptions(core));
    })
    .post(
      "/admin/subscriptions",
      adminAuth,
      express.urlencoded({ extended: false }),
      async (req, res) => {
        const b = req.body;
        try {
          if (b.del) {
            await core.storage().deleteSubscriber(b.del);
            res.redirect("subscriptions");
            return;
          }
          await core.addSubscriber({
            email: b.email,
            lat: parseFloat(b.lat),
            lon: parseFloat(b.lon),
            maxPrice: parseInt(b.max_price),
            maxRadius: parseInt(b.max_radius),
          });
          res.redirect("subscriptions");
          return;
        } catch (err) {
          log.error(err.message, { err });
          res.sendStatus(500);
          return;
        }
      }
    )
    .get("/admin/login", async (req, res) => {
      res.send(await adminViews.login());
    })
    .post(
      "/admin/login",
      express.urlencoded({ extended: false }),
      async (req, res) => {
        const login = req.body.login;
        const password = req.body.password;
        const token = await core.adminLogin(login, password);
        if (token) {
          res.cookie("token", token, { maxAge: 1000 * 3600 * 24 });
          res.redirect("updates");
        } else {
          res.send(await adminViews.login("wrong login or password"));
        }
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
      `/api/history`,
      serveJson(async (req) => {
        const filter = parseFilter(req);
        return core.getHistory(filter);
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
