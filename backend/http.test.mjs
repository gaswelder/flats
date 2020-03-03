import { createApp } from "./http.mjs";
import request from "supertest";
import * as assert from "assert";

describe("http", () => {
  it("put a snapshot", async () => {
    const snapshots = [];
    const core = {
      async addSnapshot(areaId, offers, ts) {
        snapshots.push({ areaId, offers, ts });
      },
    };
    const app = createApp(core);
    const ts = "2023-08-20T20:00:00.000Z";
    const r = await request(app)
      .put(`/api/snapshots/city1/${ts}`)
      .send([{ id: "1" }]);
    assert.deepEqual(
      { status: r.status, body: r.body },
      { status: 200, body: "ok" }
    );
    assert.deepEqual(snapshots, [
      { areaId: "city1", offers: [{ id: "1" }], ts },
    ]);
  });
});
