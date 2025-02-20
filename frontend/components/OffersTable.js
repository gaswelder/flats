import React from "react";
import styled from "styled-components";

const Table = styled.table`
  font-size: 14px;
  border-spacing: 0;
  & td {
    border-bottom: 1px solid #ccf;
    padding: 8px 6px;
  }
  & tr[data-selected="true"] {
    background-color: #b0d0b0;
  }
`;

const PriceTD = styled.td`
  text-align: right;
`;

const PriceHistoryOL = styled.ol`
  list-style-type: none;
  margin: 0;
  padding: 0;

  & li {
    display: inline;
  }
  & li:not(:last-child) {
    text-decoration: line-through;
  }
  & li:not(:first-child)::before {
    content: ", ";
  }
`;

export const OffersTable = React.memo(function OffersTable({
  offers,
  selectedOffer,
}) {
  const tableRef = React.useRef();

  return (
    <Table ref={tableRef}>
      <tbody>
        {offers.map((offer, i) => (
          <tr
            key={i}
            data-selected={selectedOffer && offer.id === selectedOffer.id}
          >
            <PriceTD>${offer.price}</PriceTD>
            <td>{offer.rooms}&nbsp;к.</td>
            <td>
              <a href={offer.url} target="_blank" rel="noreferrer noopener">
                {address(offer.address)}
              </a>
            </td>
            <td>
              {offer.priceHistory && offer.priceHistory.length > 1 && (
                <PriceHistoryOL>
                  {offer.priceHistory.map((h, i) => (
                    <li key={i}>{h.price}</li>
                  ))}
                </PriceHistoryOL>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
});

const address = (str) =>
  str
    .replace("Беларусь, ", "")
    .replace(/^(г. Минск, |Минск, )/, "")
    .replace(/улица/, "ул.");
