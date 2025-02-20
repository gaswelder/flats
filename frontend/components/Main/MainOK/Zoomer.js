import React from "react";
import styled from "styled-components";

const Div = styled.div`
  background: white;
  padding: 10px;
  text-align: center;
`;

export const Zoomer = ({ value, onChange }) => {
  return (
    <Div>
      {value.toFixed(3)}
      <input
        style={{ width: "70%" }}
        type="range"
        min={2}
        max={18}
        step={0.00001}
        value={value}
        onChange={(e) => {
          onChange(parseFloat(e.target.value));
        }}
      />
    </Div>
  );
};
