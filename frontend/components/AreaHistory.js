import React, { useEffect, useState } from "react";
import { VictoryAxis, VictoryChart, VictoryLine } from "victory";
import { API } from "../api";

export const AreaHistory = ({ area, filter }) => {
  const [history, setHistory] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (!area) return;
    const latBounds = [area.leftTop.latitude, area.rightBottom.latitude];
    const lonBounds = [area.leftTop.longitude, area.rightBottom.longitude];
    setErr(null);
    API.fetchHistory(filter.rooms, latBounds, lonBounds)
      .then(setHistory)
      .catch(setErr);
  }, [area, filter]);

  if (err) return `error while loading history: ${err.message}`;
  if (!area || !history) return null;

  const dataPrices = history.map((p) => ({ x: new Date(p.ts), y: p.price }));
  const dataCounts = history.map((p) => ({ x: new Date(p.ts), y: p.count }));
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
