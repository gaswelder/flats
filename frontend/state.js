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
  // const url = (process.env.API_URL || "") + path;
  const url = "./" + path;
  return fetch(url, params).then((r) => r.json());
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
