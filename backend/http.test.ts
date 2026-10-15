import { createApp } from "./http.ts";
import request from "supertest";
import * as assert from "assert";

describe("http", () => {
  it("put a snapshot", async () => {
    const snapshots: any[] = [];
    const core = {
      checkAdminToken: async () => true,
      storage: () => ({ deleteSubscriber: async () => {} }),
      addSubscriber: async () => {},
      getOffers: async () => [],
      getHistory: async () => [],
      async addSnapshot(areaId: string, offers: any, ts: string) {
        snapshots.push({ areaId, offers, ts });
      },
      login: async () => ({ ok: false }),
      adminLogin: async () => null,
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
