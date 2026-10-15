import haversine from "haversine-distance";
import { log } from "./lib/slog.ts";
import type { Mailer } from "./mailer.ts";

export const notifySubscribers = async (
  subscribers: any[],
  newOffers: any[],
  mailer: Mailer,
  time: string
) => {
  const now = new Date(time);

  const emails = subscribers.flatMap((s: any) => {
    return getEmails(newOffers, now, s).map((m: any) => {
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
  };
};

const getEmails = (newOffers: any[], now: Date, subscriber: any) => {
  const subscriberCoords = [subscriber.lat, subscriber.lon];
  const matches = newOffers
    .map((offer: any) => {
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
    .sort((a: any, b: any) => a.radius - b.radius);
  if (matches.length === 0) {
    return [];
  }
  log.info(`${matches.length} matches for ${subscriber.email}`);

  if (matches.length > 3) {
    return [
      {
        subject: `Flats update ${formatDateTime(now)}: ${matches.length} new matches`,
        body: formatList(matches, subscriberCoords),
      },
    ];
  }
  return matches.map((m: any) => {
    return {
      subject:
        "Flats update:" +
        ` ${m.offer.price} (${m.offer.originalPrice})` +
        ` ${m.offer.rooms}r` +
        `, R = ${Math.round(m.radius)} m`,
      body: formatList([m], subscriberCoords),
    };
  });
};

const formatDateTime = (date: Date) => formatDate(date) + ", " + formatTime(date);
const formatTime = (date: Date) =>
  [date.getHours(), date.getMinutes()].map(leadZero).join(":");
const formatDate = (date: Date) =>
  [date.getDate(), date.getMonth() + 1].map(leadZero).join(".");

function leadZero(num: number) {
  if (num < 10) {
    return "0" + num.toString();
  }
  return num.toString();
}

function formatList(matches: any[], anchorCoords: number[]) {
  return matches
    .map((match: any) => {
      const { offer, radius } = match;
      const { price, address, rooms, lat, lon } = offer;
      return [
        `$${price} (${
          offer.originalPrice
        }) ${rooms}r at ${address}, R = ${Math.round(radius)} m`,
        offer.url,
        `route (YA): https://yandex.by/maps/?rtext=${anchorCoords[0]},${anchorCoords[1]}~${lat},${lon}&rtt=mt`,
        `route (GO): https://www.google.com/maps/dir/?api=1&origin=${anchorCoords[0]},${anchorCoords[1]}&destination=${lat},${lon}`,
        "",
      ].join("\n");
    })
    .join("\n");
}
