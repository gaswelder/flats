import haversine from "haversine-distance";
import { log } from "./lib/slog.mjs";

export const notifySubscribers = async (
  subscribers,
  newOffers,
  mailer,
  time
) => {
  const now = new Date(time);

  const emails = subscribers.flatMap((s) => {
    return getEmails(newOffers, now, s).map((m) => {
      return { address: s.email, subject: m.subject, body: m.body };
    });
  });

  for (const m of emails) {
    try {
      log.info("sending email", { subject: m.subject });
      await mailer.send(m.address, m.subject, m.body);
    } catch (err) {
      log.error(`failed to send email to ${m.address}`, { err });
    }
  }
};

const getEmails = (newOffers, now, subscriber) => {
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
      if (radius > subscriber.maxRadius) {
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

  // If there are too many matches, combine them into one mail.
  if (matches.length > 3) {
    return [
      {
        subject: `Flats update ${formatDateTime(now)}: ${
          matches.length
        } new matches`,
        body: formatList(matches, subscriberCoords),
      },
    ];
  }
  return matches.map((match) => {
    return {
      subject: `Flats update: ${match.offer.price} (${match.offer.originalPrice}) ${match.offer.rooms}r, R = ${match.radius} m`,
      body: formatList([match], subscriberCoords),
    };
  });
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
