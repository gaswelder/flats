import * as t from "runtypes";

export interface OfferData {
  id: string;
  price: number;
  originalPrice: string;
  lat: number;
  lon: number;
  rooms: number;
  address: string;
  url: string;
}

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
  id = "";
  price = 0;
  originalPrice = "";
  lat = 0;
  lon = 0;
  rooms = 0;
  address = "";
  url = "";

  constructor(data: Partial<OfferData>) {
    Object.assign(this, data);
  }

  static parseFromWorker(data: any): Offer {
    return new Offer(OfferShape.check(data) as OfferData);
  }
  static parseFromDB(row: any): Offer {
    return new Offer(row);
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
  eq(x: Offer) {
    return this.contentId() == x.contentId();
  }
}
