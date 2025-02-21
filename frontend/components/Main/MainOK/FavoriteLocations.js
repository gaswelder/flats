import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { getSetting, setSetting } from "../../../state";
import { Button } from "../../lib/Elements";

const Div = styled.div`
  padding: 0.5em;
  border-bottom: thin solid #ccc;
  display: flex;
  cursor: pointer;
  & > button {
    margin-left: auto;
  }
  &:last-of-type {
    margin-bottom: 10px;
  }
`;

export const FavoriteLocations = ({ center, onSelect, onCloseClick }) => {
  const [list, setList] = useState(getSetting("favoriteLocations", []));
  useEffect(() => {
    setSetting("favoriteLocations", list);
  }, [list]);
  return (
    <div style={{ width: 300 }}>
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
      <Button
        onClick={() => {
          const name = prompt("name", "");
          if (!name) return;
          setList((x) => [...x, { id: Date.now(), name, center }]);
        }}
      >
        Save current location
      </Button>
      <Button onClick={onCloseClick}>Close</Button>
    </div>
  );
};
