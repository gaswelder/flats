import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { getSetting, setSetting } from "../state";

const Div = styled.div`
  padding: 0.5em;
  border-bottom: thin solid #ccc;
  display: flex;
  cursor: pointer;
  & > button {
    margin-left: auto;
  }
`;

export const FavoriteLocations = ({ center, onSelect }) => {
  const [list, setList] = useState(getSetting("favoriteLocations", []));
  useEffect(() => {
    setSetting("favoriteLocations", list);
  }, [list]);
  return (
    <>
      {list.map((location) => {
        return (
          <Div
            key={location.id}
            onClick={() => {
              onSelect(location.center);
            }}
          >
            {location.name}
            <button
              onClick={(e) => {
                setList((xs) => xs.filter((x) => x.id !== location.id));
                e.stopPropagation();
              }}
            >
              &times;
            </button>
          </Div>
        );
      })}
      <button
        style={{ marginTop: "1em" }}
        onClick={() => {
          const name = prompt("name", "");
          if (!name) {
            return;
          }
          setList((x) => [...x, { id: Date.now(), name, center }]);
        }}
      >
        Save current location
      </button>
    </>
  );
};
