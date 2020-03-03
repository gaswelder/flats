import React from "react";

export const OffersBox = ({ offers, onClick, filter }) => {
  const prices = offers.map((x) => x.price);
  let min = prices[0];
  let max = prices[0];
  let avg = 0;
  for (const p of prices) {
    if (p < min) {
      min = p;
    }
    if (p > max) {
      max = p;
    }
    avg += p;
  }
  avg /= prices.length;

  const ABS_MIN = 50;
  const expensiveness = (avg - ABS_MIN) / (filter.price[1] - ABS_MIN);
  const hue = 120 - expensiveness * 120;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: `hsl(${hue}, 80%, 80%)`,
        borderRadius: 5,
        padding: 5,
        opacity: 0.9,
        cursor: "pointer",
      }}
    >
      {min == max && avg}
      {min != max && (
        <>
          {min}&ndash;{max}
        </>
      )}
      {offers.length > 1 && <> ({offers.length})</>}
    </div>
  );
};
