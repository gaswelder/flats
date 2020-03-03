import React from "react";
import styled from "styled-components";
import { VictoryChart, VictoryHistogram, VictoryTheme } from "victory";
import { AveragesPlot } from "./AveragesPlot";
import { CountsPlot } from "./CountsPlot";

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
  return (
    <Div>
      <figure>
        <figcaption>Price distribution for current filter</figcaption>
        <VictoryChart theme={VictoryTheme.grayscale} height={200}>
          <VictoryHistogram data={offers.map((x) => ({ x: x.price }))} />
        </VictoryChart>
      </figure>
      <AveragesPlot area={area} filter={filter} />
      <figure>
        <figcaption>Offer count over time</figcaption>
        <CountsPlot area={area} filter={filter} />
      </figure>
    </Div>
  );
};
