import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  VictoryAxis,
  VictoryChart,
  VictoryHistogram,
  VictoryLine,
  VictoryTheme,
} from "victory";
import { fetchAverages, fetchOfferCounts } from "../state";

const Div = styled.div`
  & figure {
    display: inline-block;
    margin: 10px 0 0 10px;
    padding: 10px;
    padding-bottom: 0;
    max-width: 400px;
  }
`;

export const Stats = ({ offers, area, filter }) => {
  const [prices, setPrices] = useState(null);
  const [pricesErr, setPricesErr] = useState(null);
  const [counts, setCounts] = useState();
  const [countsErr, setCountsErr] = useState(null);

  useEffect(() => {
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
  if (!counts) {
    return "Loading...";
  }

  const dataPrices = prices.map((p) => ({ x: new Date(p.ts), y: p.price }));
  const dataCounts = counts.map((p) => ({ x: new Date(p.ts), y: p.count }));

  return (
    <Div>
      <figure>
        <figcaption>Price distribution for current filter</figcaption>
        <VictoryChart theme={VictoryTheme.grayscale} height={200}>
          <VictoryHistogram data={offers.map((x) => ({ x: x.price }))} />
        </VictoryChart>
      </figure>

      <div style={{ width: "500px" }}>
        <XYPlot xys={dataPrices} noxaxis title="Prices" />
        <div style={{ position: "relative", top: -100 }}>
          <XYPlot xys={dataCounts} title="Counts" />
        </div>
      </div>
    </Div>
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
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return d.toString().padStart(2, 0) + "." + m.toString().padStart(2, 0);
};
