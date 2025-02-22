import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { getSetting } from "../../../state";
import { styles } from "../../lib/Elements";

const Root = styled.div`
  ${styles.sheet}
  cursor: pointer;
`;

export const LocationBalloon = ({ center, onClick, style }) => {
  return (
    <Root onClick={onClick} style={style}>
      <b>Location</b>
      <Deb val={center}>
        {(val) => {
          const locs = getSetting("favoriteLocations", []);
          const loc = locs.find(
            (x) =>
              Math.abs(val.latitude - x.center.latitude) < 1 &&
              Math.abs(val.longitude - x.center.longitude) < 1
          );
          return (
            <div>
              {loc
                ? loc.name
                : `${val.latitude.toFixed(8)} ${val.longitude.toFixed(8)}`}
            </div>
          );
        }}
      </Deb>
    </Root>
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
