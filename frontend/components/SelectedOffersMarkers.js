import React, { useState } from "react";
import { InfoBox, Pin } from "../rsm/index";
import styled from "styled-components";
import { archiveSuggestedOffers, fetchSuggestedOffers } from "../state";
import { OfferMapTooltip } from "./OfferMapTooltip";
import { useResource } from "./util";

const MarkerDiv = styled.div`
  cursor: pointer;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: #7474ee;

  & span {
    position: absolute;
    left: 20px;
    top: 0;
  }
`;

export const SelectedOffersMarkers = () => {
  const suggestedOffers = useResource(fetchSuggestedOffers, []);
  const [offerId, setOfferId] = useState();
  const openOffer = (suggestedOffers.data || []).find((x) => x.id == offerId);
  return (
    <>
      {(suggestedOffers.data || []).map((offer) => {
        return (
          <Pin
            key={offer.id}
            coords={{ latitude: offer.lat, longitude: offer.lon }}
          >
            <MarkerDiv
              onClick={() => {
                setOfferId(offer.id);
              }}
            >
              <span>{offer.price}</span>
            </MarkerDiv>
          </Pin>
        );
      })}
      {openOffer && (
        <InfoBox coords={{ latitude: openOffer.lat, longitude: openOffer.lon }}>
          <OfferMapTooltip offers={[openOffer]} />
          <button
            onClick={() => {
              setOfferId(null);
            }}
          >
            &times;
          </button>
          <button
            onClick={() => {
              if (confirm("archive this offer?")) {
                archiveSuggestedOffers([openOffer.id]).then(() => {
                  suggestedOffers.reload();
                });
              }
            }}
          >
            Archive
          </button>
        </InfoBox>
      )}
    </>
  );
};
