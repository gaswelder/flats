import haversine from "haversine-distance";
import { log } from "../lib/slog.mjs";

export const notifySubscribers = async (
  subscribers,
  newOffers,
  mailer,
  time,
  dbx
) => {
  const now = new Date(time);

  for (const subscriber of subscribers) {
    try {
      await notifyOne(mailer, newOffers, now, dbx, subscriber);
    } catch (err) {
      log.error(`notification failed for ${subscriber.email}`, err);
    }
  }
};

const notifyOne = async (mailer, newOffers, now, dbx, subscriber) => {
  const subscriberCoords = [subscriber.lat, subscriber.lon];
  const matches = newOffers
    .map((offer) => {
      if (offer.price > subscriber.max_price) {
        return null;
      }
      const radius = haversine(
        { lat: offer.lat, lon: offer.lon },
        { lat: subscriber.lat, lon: subscriber.lon }
      );
      if (radius > subscriber.max_radius) {
        return null;
      }
      return { offer, radius };
    })
    .filter(Boolean)
    .sort((a, b) => a.radius - b.radius);
  if (matches.length == 0) {
    return;
  }
  log.info(`${matches.length} matches for ${subscriber.email}`);
  if (matches.length > 3) {
    await mailer.send(
      subscriber.email,
      `Flats update ${formatDateTime(now)}: ${matches.length} new matches`,
      formatList(matches, subscriberCoords)
    );
  } else {
    await Promise.all(
      matches.map(async (match) => {
        await mailer.send(
          subscriber.email,
          `Flats update: ${match.offer.price} (${match.offer.originalPrice}) ${match.offer.rooms}r, R = ${match.radius} m`,
          formatList([match], subscriberCoords)
        );
      })
    );
  }
};

const formatDateTime = (date) => formatDate(date) + ", " + formatTime(date);
const formatTime = (date) =>
  [date.getHours(), date.getMinutes()].map(leadZero).join(":");
const formatDate = (date) =>
  [date.getDate(), date.getMonth() + 1].map(leadZero).join(".");

function leadZero(num) {
  if (num < 10) {
    return "0" + num.toString();
  }
  return num.toString();
}

function formatList(matches, anchorCoords) {
  return matches
    .map((match) => {
      const { offer, radius } = match;
      const { price, address, rooms, lat, lon } = match.offer;
      return [
        `$${price} (${
          offer.originalPrice
        }) ${rooms}r at ${address}, R = ${Math.round(radius)} m`,
        match.offer.url,
        `route (YA): https://yandex.by/maps/?rtext=${anchorCoords[0]},${anchorCoords[1]}~${lat},${lon}&rtt=mt`,
        `route (GO): https://www.google.com/maps/dir/?api=1&origin=${anchorCoords[0]},${anchorCoords[1]}&destination=${lat},${lon}`,
        "",
      ].join("\n");
    })
    .join("\n");
}
