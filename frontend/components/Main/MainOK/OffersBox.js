import React from "react";
import styled from "styled-components";

const getSizeStyle = (num) => {
  if (num < 5) return { fontWeight: "normal", fontSize: 11 };
  if (num < 20) return { fontWeight: "normal", fontSize: 12 };
  if (num < 35) return { fontWeight: "normal", fontSize: 13 };
  if (num < 50) return { fontWeight: "normal", fontSize: 14 };
  if (num < 65) return { fontWeight: "bold", fontSize: 11 };
  if (num < 80) return { fontWeight: "bold", fontSize: 12 };
  if (num < 95) return { fontWeight: "bold", fontSize: 13 };
  return { fontWeight: "bold", fontSize: 14 };
};

const Div = styled.div`
  background-color: ${(props) => `hsl(${props.hue}, 80%, 80%)`};
  border-radius: 5px;
  padding: 5px;
  opacity: 0.9;
  cursor: pointer;
  border: 1px solid #888;
  font-weight: ${(props) => getSizeStyle(props.size).fontWeight};
  font-size: ${(props) => getSizeStyle(props.size).fontSize}px;
`;

const getMinMax = (offers) => {
  let min = offers[0].price;
  let max = offers[0].price;
  for (const o of offers) {
    const p = o.price;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return [min, max];
};

const ABS_MIN = 50;

const roughen = (x) => Math.round(x * 10) / 10;

export const OffersBox = ({ offers, onClick, filter }) => {
  const [min, max] = getMinMax(offers);
  const expensiveness = roughen((min - ABS_MIN) / (filter.price[1] - ABS_MIN));
  const hue = 120 - expensiveness * 120;

  return (
    <Div onClick={onClick} hue={hue} size={offers.length}>
      ${min}
      {min != max && <>&ndash;{max}</>}
      {offers.length > 1 && <> ({offers.length})</>}
    </Div>
  );
};
