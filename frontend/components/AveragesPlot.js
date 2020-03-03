import React, { useState } from "react";
import { VictoryChart, VictoryLine } from "victory";
import { fetchAverages } from "../state";

export const AveragesPlot = ({ area, filter }) => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  React.useEffect(() => {
    const latBounds = [area.leftTop.latitude, area.rightBottom.latitude];
    const lonBounds = [area.leftTop.longitude, area.rightBottom.longitude];
    fetchAverages(filter.rooms, latBounds, lonBounds).then((result) => {
      if (Array.isArray(result)) {
        setData(result);
      } else {
        setErr("failed to load data");
      }
    });
  }, [area, filter]);
  return (
    <figure>
      <figcaption>Average price over time</figcaption>
      {err ? (
        err
      ) : (
        <>
          {data ? (
            <VictoryChart height={200}>
              <VictoryLine
                data={data.map((x) => ({
                  x: new Date(x.ts),
                  y: parseFloat(x.price),
                }))}
              ></VictoryLine>
            </VictoryChart>
          ) : (
            "Loading..."
          )}
        </>
      )}
    </figure>
  );
};
