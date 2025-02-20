import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Window } from "../../lib/Window";
import { FavoriteLocations } from "./FavoriteLocations";

const MenuDiv = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  display: flex;
`;

const MenuItem = styled.div`
  padding: 10px;
  cursor: pointer;
  background-color: ${(props) => (props.active ? "#eee" : "transparent")};
  flex: 1;
  text-align: center;
  border-right: solid 1px #ddd;
  & > b {
    font-weight: normal;
  }
  & > div {
    font-size: 10px;
  }
`;

export const LowerBar = ({
  tab,
  center,
  setCenter,
  setTab,
  zoom,
  setZoom,
  controllerState,
}) => {
  return (
    <>
      {tab == "location" && (
        <Window>
          <FavoriteLocations
            center={center}
            onSelect={(coords) => {
              setCenter(coords);
              setTab("");
            }}
          />
        </Window>
      )}
      {/* <Div>
          <Console />
        </Div> */}
      <MenuDiv>
        <MenuItem
          active={tab == "location"}
          onClick={() => {
            if (tab == "location") {
              setTab("");
            } else {
              setTab("location");
            }
          }}
        >
          <b>Location</b>
          <Deb val={center}>
            {(val) => (
              <div>
                {val.latitude.toFixed(8)}
                <br />
                {val.longitude.toFixed(8)}
              </div>
            )}
          </Deb>
        </MenuItem>
        <MenuItem>
          {zoom.toFixed(3)}
          <input
            style={{ width: 100 }}
            type="range"
            min={2}
            max={18}
            step={0.00001}
            value={zoom}
            onChange={(e) => {
              clearTimeout(controllerState.zoomTimer);
              setZoom(parseFloat(e.target.value));
            }}
          />
        </MenuItem>
      </MenuDiv>
    </>
  );
};

const Deb = ({ val, children }) => {
  const [debval, setDebval] = useState(val);
  const ref = useRef(val);
  ref.current = val;
  useEffect(() => {
    const t = setInterval(() => {
      if (debval != ref.current) {
        setDebval(ref.current);
      }
    }, 200);
    return () => clearInterval(t);
  }, [debval]);

  return children(debval);
};
