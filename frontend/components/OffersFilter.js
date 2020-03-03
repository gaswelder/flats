import React, { useState } from "react";
import styled from "styled-components";

const Form = styled.form`
  font-size: 16px;
  align-items: baseline;
  padding: 2px 10px;
  border-radius: 4px;
  & section > label {
    display: block;
  }
  & section {
    margin: 0.5em;
  }
`;
const CheckboxesContainer = styled.div`
  display: inline-block;
`;

const toggle = (xs, y) =>
  xs.includes(y) ? xs.filter((x) => x !== y) : xs.concat([y]);

export const OffersFilter = ({ filter, onApply, onCancel }) => {
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
      <section>
        <label>Rooms</label>
        <CheckboxesContainer>
          {[0, 1, 2, 3].map((i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={rooms.includes(i + 1)}
                onChange={() => {
                  setRooms((xs) => toggle(xs, i + 1));
                }}
              ></input>{" "}
              {i + 1}
            </label>
          ))}
        </CheckboxesContainer>
      </section>
      <section>
        <label>Max price, $</label>
        <input
          type="number"
          size="4"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </section>
      <button type="submit">Apply</button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </Form>
  );
};
