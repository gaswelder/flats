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
