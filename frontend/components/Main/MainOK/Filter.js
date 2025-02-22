import React, { useState } from "react";
import styled from "styled-components";
import { Button, styles } from "../../lib/Elements";
import { clamp } from "../../util";

const Form = styled.form`
  ${styles.sheet}
  font-size: 16px;
  align-items: baseline;
  & section {
    margin: 0.5em;
  }
`;

const roomsToMin = (rooms) => clamp(1, 4, Math.max(...rooms));
const minToRooms = (min) => {
  const len = clamp(1, 4, min);
  return [...Array(len).fill(0).keys()].map((x) => x + 1);
};

const Root = styled.div`
  ${styles.sheet}
  cursor: pointer;
`;

export const FilterBalloon = ({ filter, onClick, style }) => {
  return (
    <Root onClick={onClick} style={style}>
      <b>Filter</b>
      <br />
      {filter.rooms.join(",")}&nbsp;r &lt;&nbsp;${filter.price[1]}
    </Root>
  );
};

export const Filter = ({ filter, onApply, onCancel }) => {
  const [rooms, setRooms] = useState(filter.rooms);
  const [maxPrice, setMaxPrice] = useState(filter.price[1]);

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        e.target.querySelectorAll(":focus").forEach((e) => {
          e.blur();
        });
        onApply({ ...filter, rooms, price: [filter.price[0], maxPrice] });
      }}
    >
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <label>Min. rooms</label>
        <input
          type="number"
          min="1"
          max="4"
          value={roomsToMin(rooms)}
          onChange={(e) => {
            const min = parseInt(e.target.value);
            setRooms(minToRooms(min));
          }}
        />
        <label>Max. price, $</label>
        <input
          type="number"
          size="4"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </section>
      <Button type="submit">Apply</Button>
      <Button type="button" onClick={onCancel}>
        Cancel
      </Button>
    </Form>
  );
};
