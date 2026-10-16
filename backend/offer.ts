export type OfferData = {
  id: string;
  price: number;
  originalPrice: string;
  lat: number;
  lon: number;
  rooms: number;
  address: string;
  url: string;
};

export class Offer {
  id = "";
  price = 0;
  originalPrice = "";
  lat = 0;
  lon = 0;
  rooms = 0;
  address = "";
  url = "";

  constructor(data: OfferData) {
    Object.assign(this, data);
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
