import React, { useEffect, useState } from "react";
import { VictoryAxis, VictoryChart, VictoryLine } from "victory";
import { fetchOfferCounts } from "../state";

export const CountsPlot = ({ area, filter }) => {
  const [counts, setCounts] = useState();
  const [err, setErr] = useState(null);
  useEffect(() => {
    const latBounds = [area.leftTop.latitude, area.rightBottom.latitude];
    const lonBounds = [area.leftTop.longitude, area.rightBottom.longitude];
    fetchOfferCounts(filter.rooms, latBounds, lonBounds, filter.price[1]).then(
      (result) => {
        if (Array.isArray(result)) {
          setCounts(result);
        } else {
          setErr("failed to load data");
        }
      }
    );
  }, [area, filter]);
  if (err) {
    return err;
  }
  if (!counts) {
    return "Loading...";
  }
  return (
    <VictoryChart height={200}>
      <VictoryLine
        data={counts.map((x) => ({
          x: new Date(x.ts),
          y: parseInt(x.count, 10),
        }))}
      ></VictoryLine>
      <VictoryAxis tickCount={8} tickFormat={md} />
      <VictoryAxis dependentAxis={true} />
    </VictoryChart>
  );
};

const md = (x) => {
  // There's a bug: even though data is mapped to Date objects,
  // here it's passed as milliseconds, so we have to convert to
  // date again.
  const date = new Date(x);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return d.toString().padStart(2, 0) + "." + m.toString().padStart(2, 0);
};
