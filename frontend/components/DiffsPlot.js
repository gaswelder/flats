import React from "react";

export const DiffsPlot = (props) => {
  const { diffs } = props;

  const node = React.useRef();

  React.useEffect(() => {
    if (node.current) {
      node.current.innerHTML = renderDiffs(
        diffs.map((d) => ({ ...d, ts: new Date(d.ts) })),
        300,
        300
      );
    }
  }, [node, diffs]);
  return <div ref={node}>diff</div>;
};

const renderDownArrow = (x, y) => {
  return `
          <line x1="${x}" y1="${y}" x2="${x + 5}" y2="${
    y - 5
  }" stroke="green" stroke-width="1"/>
          <line x1="${x}" y1="${y}" x2="${x - 5}" y2="${
    y - 5
  }" stroke="green" stroke-width="1"/>
        `;
};

const renderUpArrow = (x, y, s) => {
  return `
            <line x1="${x}" y1="${y}" x2="${x + 5}" y2="${
    y + 5
  }" stroke="${s}" stroke-width="1"/>
            <line x1="${x}" y1="${y}" x2="${x - 5}" y2="${
    y + 5
  }" stroke="${s}" stroke-width="1"/>
          `;
};

const renderDiffs = (diffs, width, height) => {
  const times = diffs.map((offer) => offer.ts.getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const x = (t) => ((t - minTime) / (maxTime - minTime)) * width;

  const prices = diffs.map((offer) => offer.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const y = (price) =>
    height - ((price - minPrice) / (maxPrice - minPrice)) * height;

  const renderChange = (offer) => {
    const dt = (Math.random() - 0.5) * 20 * 1000 * 3600;
    const x0 = x(offer.ts.getTime() + dt);
    const y1 = y(offer.price);
    const y2 = y(offer.price + offer.diff);
    const s = offer.diff > 0 ? "red" : "green";
    const arrow =
      offer.diff > 0 ? renderUpArrow(x0, y2, s) : renderDownArrow(x0, y2, s);
    return `
          <line x1="${x0}" y1="${y1}" x2="${x0}" y2="${y2}" stroke="${s}" stroke-width="2"/>
          ${arrow}
        `;
  };

  const priceLines = Array(100)
    .fill(0)
    .map((z, i) => i * 100)
    .filter((v) => v >= minPrice && v <= maxPrice);

  const truncateToDate = (t) => {
    const date = new Date(t);
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ).getTime();
  };
  const timeLines = Array(100)
    .fill(0)
    .map((z, i) =>
      truncateToDate(minTime - 1000 * 3600 * 24 + i * 1000 * 3600 * 24)
    )
    .filter((t) => t >= minTime && t <= maxTime);

  const renderPriceGridLine = (price) => {
    const x1 = x(minTime);
    const x2 = x(maxTime);
    const y0 = y(price);
    return `
          <line x1="${x1}" y1="${y0}" x2="${x2}" y2="${y0}" stroke="#aaaaaaaa" />
        `;
  };

  const renderTimeLine = (t) => {
    const x0 = x(t);
    const y1 = y(minPrice);
    const y2 = y(maxPrice);
    return `<line x1="${x0}" y1="${y1}" x2="${x0}" y2="${y2}" stroke="#aaaaaaaa" />`;
  };

  const renderTimeLabel = (t) => {
    const d = new Date(t);
    const fmt = [d.getDate(), d.getMonth() + 1]
      .map((x) => x.toString().padStart(2, 0))
      .join(".");
    return `<text x="${x(t)}" y="${y(minPrice)}" class="label">${fmt}</text>`;
  };

  const renderPriceLabel = (price) => {
    return `<text x="${x(minTime)}" y="${y(
      price
    )}" class="label">${price}</text>`;
  };

  return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink">
            <style>
            .label {
              font-size: 12px;
            }
            </style>
            ${priceLines.map(renderPriceGridLine).join("")}
            ${timeLines.map(renderTimeLine).join("")}
            ${priceLines.map(renderPriceLabel).join("")}
            ${timeLines.map(renderTimeLabel).join("")}
            ${diffs.map(renderChange).join("")}
        </svg>
      `;
};
