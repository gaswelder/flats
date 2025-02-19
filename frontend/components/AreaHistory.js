import React, { useEffect, useState } from "react";
import { VictoryAxis, VictoryChart, VictoryLine } from "victory";
import { fetchAverages, fetchOfferCounts } from "../state";

export const AreaHistory = ({ area, filter }) => {
  const [prices, setPrices] = useState(null);
  const [pricesErr, setPricesErr] = useState(null);
  const [counts, setCounts] = useState();
  const [countsErr, setCountsErr] = useState(null);

  useEffect(() => {
    if (!area) return;
    const latBounds = [area.leftTop.latitude, area.rightBottom.latitude];
    const lonBounds = [area.leftTop.longitude, area.rightBottom.longitude];
    fetchAverages(filter.rooms, latBounds, lonBounds).then((result) => {
      if (Array.isArray(result)) {
        setPrices(result);
      } else {
        setPricesErr("failed to load data");
      }
    });
    fetchOfferCounts(filter.rooms, latBounds, lonBounds, filter.price[1]).then(
      (result) => {
        if (Array.isArray(result)) {
          setCounts(result);
        } else {
          setCountsErr("failed to load data");
        }
      }
    );
  }, [area, filter]);

  if (countsErr) return countsErr;
  if (pricesErr) return pricesErr;
  if (!area || !counts || !prices) {
    return null;
  }
  const dataPrices = prices.map((p) => ({ x: new Date(p.ts), y: p.price }));
  const dataCounts = counts.map((p) => ({ x: new Date(p.ts), y: p.count }));
  return (
    <>
      <XYPlot xys={dataPrices} noxaxis title="Prices" />
      <div style={{ position: "relative", top: -100 }}>
        <XYPlot xys={dataCounts} title="Counts" />
      </div>
    </>
  );
};

const XYPlot = ({ xys, noxaxis, title }) => {
  return (
    <div style={{ position: "relative" }}>
      <p style={{ position: "absolute", left: 80, top: 80 }}>{title}</p>
      <VictoryChart height={200}>
        <VictoryAxis
          crossAxis
          tickFormat={noxaxis ? () => null : formatDateTick}
        />
        <VictoryAxis dependentAxis />
        <VictoryLine data={xys} />
      </VictoryChart>
    </div>
  );
};

const formatDateTick = (x) => {
  const date = new Date(x);
  return Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    year: "2-digit",
  }).format(date);
};
