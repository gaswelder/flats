const fetchJSON = (path, params) => {
  const url = "./" + path;
  return fetch(url, params).then((r) => r.json());
};

export const API = {
  async login(user, password) {
    const r = await fetchJSON(`api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password }),
    });
    if (!("ok" in r)) {
      throw new Error(`unrecognized response shape: ${JSON.stringify(r)}`);
    }
    return { ok: r.ok, token: r.token };
  },

  async fetchOffers(rooms, latBounds, lonBounds, maxPrice) {
    return fetchJSON(
      `api/offers?rooms=${rooms}&max-price=${maxPrice}&lat=${latBounds}&lon=${lonBounds}`
    );
  },

  async fetchHistory(rooms, latBounds, lonBounds, maxPrice) {
    const counts = await fetchJSON(
      `api/counts?max-price=${maxPrice}&rooms=${rooms}&lat=${latBounds}&lon=${lonBounds}`
    );
    const prices = await fetchJSON(
      `api/averages?max-price=${10000000}&rooms=${rooms}&lat=${latBounds}&lon=${lonBounds}`
    );
    const pricesM = new Map(prices.map((x) => [x.ts, x.price]));
    return counts.map((x) => {
      const p = pricesM.get(x.ts);
      return {
        ts: x.ts,
        count: x.count,
        price: p,
      };
    });
  },
};
