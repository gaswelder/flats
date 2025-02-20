import t from "runtypes";

const OfferShape = t.Record({
  id: t.String,
  price: t.Number,
  originalPrice: t.String,
  lat: t.Number,
  lon: t.Number,
  rooms: t.Number,
  address: t.String,
  url: t.String,
});

export class Offer {
  constructor(data) {
    Object.assign(this, data);
  }

  contentId() {
    return [
      this.price,
      this.lat,
      this.lon,
      this.rooms,
      this.address,
      this.url,
    ].join("/");
  }
  eq(x) {
    return this.contentId() == x.contentId();
  }
}
Offer.parseFromWorker = (data) => {
  return new Offer(OfferShape.check(data));
};
Offer.parseFromDB = (row) => {
  return new Offer(row);
};
