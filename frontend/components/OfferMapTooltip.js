import React from "react";
import styled from "styled-components";

const RootDiv = styled.div`
  max-height: 300px;
  overflow-y: auto;
  min-width: 300px;
  & > div:not(:last-child)::after {
    content: "";
    display: block;
    margin: 5px 0 10px 0px;
    background: linear-gradient(to right, #ccc, #dcddea, white);
    height: 1px;
  }
`;

const stop = (e) => e.stopPropagation();

const offerProvider = (offer) => offer.id.substring(0, offer.id.indexOf(":"));

export const OfferMapTooltip = ({ offers }) => {
  return (
    <RootDiv onWheel={stop}>
      {offers
        .sort((x, y) => x.price - y.price)
        .map((offer) => (
          <div key={offer.id}>
            <b>{offer.price}</b>
            <br />
            {offer.address}
            {offer.diff && formatDiff(offer.diff)}
            <br />
            <a href={offer.url} target="_blank" rel="noreferrer">
              {offerProvider(offer)}
            </a>{" "}
            |&nbsp;
            <a
              href={route(null, { latitude: offer.lat, longitude: offer.lon })}
              target="_blank"
              rel="noreferrer"
            >
              route
            </a>
          </div>
        ))}
    </RootDiv>
  );
};

// &origin=${from.latitude},${from.longitude}
const route = (from, to) =>
  `https://www.google.com/maps/dir/?api=1&destination=${to.latitude},${to.longitude}`;

const formatDiff = (diff) => (diff < 0 ? "&minus;" : "+") + Math.abs(diff);
