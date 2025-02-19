import { createStore } from "redux";

export const getSetting = (key, def) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || def;
  } catch (e) {
    return def;
  }
};

export const setSetting = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
};

export const loadFilter = () =>
  getSetting("filter", { rooms: [1, 2], price: [0, 400] });
export const saveFilter = (filter) => setSetting("filter", filter);

const fetchJSON = (path, params) => {
  const url = (process.env.API_URL || "") + path;
  return fetch(url, params).then((r) => r.json());
};

const initialState = {
  selectedOffer: null,
  snapshot: {
    err: null,
    loading: false,
    data: null,
  },
  diffs: [],
  filter: loadFilter(),
};

const assoc = (m, k, v) => {
  if (m[k] === v) {
    return m;
  }
  return { ...m, [k]: v };
};

const assocIn = (m, ks, v) => {
  if (ks.length === 0) {
    throw new Error("empty path");
  }
  const k = ks[0];
  if (ks.length === 1) {
    return assoc(m, k, v);
  }
  return {
    ...m,
    [k]: assocIn(m[k], ks.slice(1), v),
  };
};

const findOffer = (state, id) =>
  state.snapshot.data.offers.find((x) => x.id === id);

const reducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case "snapshot-load-begin":
      return assocIn(state, ["snapshot", "loading"], true);
    case "snapshot-loaded":
      return assoc(state, "snapshot", {
        err: null,
        loading: false,
        data: payload,
      });
    case "set-diffs":
      return assoc(state, "diffs", payload);
    case "select-offer":
      return assoc(state, "selectedOffer", findOffer(state, payload.id));
    case "set-filter": {
      const filter = payload;
      saveFilter(filter);
      return assoc(state, "filter", filter);
    }
    default:
      return state;
  }
};

const a = (type, payload) => ({ type, payload });

export const selectOffer = (offer) => store.dispatch(a("select-offer", offer));

export const getOffers = (state) =>
  state.snapshot.data ? state.snapshot.data.offers : [];

export const offerMatchesFilter = (filter, offer) => {
  return filter.rooms.includes(offer.rooms) && offer.price <= filter.price[1];
};

export const getFilter = (state) => state.filter;

export const store = createStore(reducer);

export const fetchDiffs = async () => {
  const diffs = await fetchJSON("api/diffs");
  store.dispatch({ type: "set-diffs", payload: diffs });
};

export const fetchOfferCounts = (rooms, latBounds, lonBounds, maxPrice) => {
  return fetchJSON(
    `api/counts?max-price=${maxPrice}&rooms=${rooms}&lat=${latBounds}&lon=${lonBounds}`
  );
};

export const fetchAverages = (rooms, latBounds, lonBounds) => {
  return fetchJSON(
    `api/averages?max-price=${10000000}&rooms=${rooms}&lat=${latBounds}&lon=${lonBounds}`
  );
};

export const setFilter = (filter) => {
  store.dispatch({ type: "set-filter", payload: filter });
};

export const fetchOffers = (rooms, latBounds, lonBounds, maxPrice) => {
  return fetchJSON(
    `api/offers?rooms=${rooms}&max-price=${maxPrice}&lat=${latBounds}&lon=${lonBounds}`
  );
};

export const login = async (user, password) => {
  const r = await fetchJSON(`api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, password }),
  });
  if (!("ok" in r)) {
    throw new Error(`unrecognized response shape: ${JSON.stringify(r)}`);
  }
  if (r.ok) {
    setSetting("token", r.token);
  }
  return r.ok;
};
