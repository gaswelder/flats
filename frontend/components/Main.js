import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { Clusters, InfoBox, SlippyMap } from "../rsm/index";
import {
  fetchOffers,
  getSetting,
  loadFilter,
  login,
  saveFilter,
  setSetting,
} from "../state";
import { AreaHistory } from "./AreaHistory";
import { FavoriteLocations } from "./FavoriteLocations";
import { LoginForm } from "./LoginForm";
import { OfferMapTooltip } from "./OfferMapTooltip";
import { OffersBox } from "./OffersBox";
import { OffersFilter } from "./OffersFilter";
import { OffersTable } from "./OffersTable";
import { Stats } from "./Stats";
import { Window } from "./Window";
import { Shy } from "./lib/Shy";
import { useDebouncedCallback } from "./util";

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

const rootDivStyle = {
  position: "absolute",
  inset: 0,
};

const stop = (e) => {
  e.stopPropagation();
};

const clamp = (min, max, val) => {
  let r = val;
  if (r > max) r = max;
  if (r < min) r = min;
  return r;
};

export const Main = () => {
  const [state, setState] = useState({
    type: getSetting("token") ? "ok" : "none",
  });

  if (state.type == "ok") {
    return <MainOk />;
  }
  if (state.type == "waitingAuth") {
    return "logging in...";
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const u = e.target.querySelector('[name="user"').value;
    const p = e.target.querySelector('[name="password"').value;
    console.log({ u, p });
    setState({ type: "waitingAuth" });
    const ok = await login(u, p);
    if (!ok) {
      setState({ type: "failed" });
    } else {
      setState({ type: "ok" });
    }
  };
  return (
    <>
      {state.type == "failed" && <p>Login failed</p>}
      <LoginForm onSubmit={onSubmit} />;
    </>
  );
};

const MainOk = () => {
  const [filter, setFilter] = useState(loadFilter());
  const [tab, setTab] = useState("");
  const [offers, setOffers] = useState([]);
  const [selectedOffers, setSelectedOffers] = useState(null);
  const [area, setArea] = useState(null);

  const $loadOffers = useDebouncedCallback(
    (area) => {
      setArea(area);
      setSetting("defaultCenter", area.center);
      fetchOffers(
        filter.rooms,
        [area.leftTop.latitude, area.rightBottom.latitude],
        [area.leftTop.longitude, area.rightBottom.longitude],
        filter.price[1]
      ).then((data) => {
        setOffers(data.offers);
      });
    },
    [filter]
  );

  const $objects = useMemo(() => {
    return offers.map((offer) => {
      return {
        coords: { latitude: offer.coords[0], longitude: offer.coords[1] },
        data: offer,
      };
    });
  }, [offers]);

  const $renderCluster = useCallback(
    (cluster) => (
      <OffersBox
        offers={cluster.objects.map((x) => x.data)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedOffers({
            coords: cluster.coords,
            list: cluster.objects.map((x) => x.data),
          });
        }}
        filter={filter}
      />
    ),
    [filter]
  );

  const $onMapClick = useCallback(() => {
    setSelectedOffers(null);
  }, []);

  const [zoom, setZoom] = useState(getSetting("defaultZoom", 16));
  const [center, setCenter] = useState(
    getSetting("defaultCenter", {
      latitude: 53.9413,
      longitude: 27.4657,
    })
  );
  useEffect(() => {
    setSetting("defaultZoom", zoom);
  }, [zoom]);
  useEffect(() => {
    setSetting("defaultCenter", center);
  }, [center]);

  const controllerState = useRef({
    zoomSpeed: 0,
    zoomTimer: null,
    dragSpeed: [0, 0],
    dragTimer: null,
  }).current;

  const $zoomTick = useCallback(() => {
    setZoom((x) => clamp(2, 18, x + controllerState.zoomSpeed));
    controllerState.zoomSpeed *= 0.8;
    if (Math.abs(controllerState.zoomSpeed) < 0.001) {
      controllerState.zoomSpeed = 0;
      return;
    }
    controllerState.zoomTimer = setTimeout($zoomTick, 10);
  }, [controllerState]);

  const $dragTick = useCallback(() => {
    controllerState.dragSpeed[0] *= 0.8;
    controllerState.dragSpeed[1] *= 0.8;
    if (
      controllerState.dragSpeed[0] ** 2 + controllerState.dragSpeed[1] ** 2 <
      0.00000000001
    ) {
      return;
    }
    setCenter((x) => ({
      latitude: x.latitude + controllerState.dragSpeed[0],
      longitude: x.longitude + controllerState.dragSpeed[1],
    }));
    controllerState.dragTimer = setTimeout($dragTick, 10);
  }, [controllerState]);

  const $onWheel = useCallback(
    (event) => {
      if (event.deltaMode != WheelEvent.DOM_DELTA_PIXEL) {
        console.warn(`unexpected wheel event delta mode: ${event.deltaMode}`);
        return;
      }
      clearTimeout(controllerState.zoomTimer);
      controllerState.zoomSpeed = event.deltaY / 2000;
      $zoomTick();
    },
    [controllerState, $zoomTick]
  );

  const $onPinch = useCallback(
    (e) => {
      clearTimeout(controllerState.zoomTimer);
      setZoom((x) => clamp(2, 18, x + e.pinch / 100));
    },
    [controllerState]
  );

  const $onMove = useCallback(
    (e) => {
      clearTimeout(controllerState.dragTimer);
      setCenter(e);
    },
    [controllerState]
  );

  const $onMoveEnd = useCallback(
    (e) => {
      controllerState.dragSpeed = e.speed;
      $dragTick();
    },
    [controllerState, $dragTick]
  );

  return (
    <div style={rootDivStyle} id="app-map-root">
      <SlippyMap
        baseTilesUrl="https://b.tile.openstreetmap.org"
        zoom={zoom}
        center={center}
        onMove={$onMove}
        onMoveEnd={$onMoveEnd}
        onAreaChange={$loadOffers}
        onClick={$onMapClick}
        onWheel={$onWheel}
        onPinch={$onPinch}
      >
        <Clusters threshold={30} objects={$objects} render={$renderCluster} />
        {selectedOffers && (
          <InfoBox coords={selectedOffers.coords} onClick={stop}>
            <OfferMapTooltip offers={selectedOffers.list} />
          </InfoBox>
        )}
      </SlippyMap>
      <div style={{ position: "absolute", left: 6, top: 6 }}>
        <FilterControl filter={filter} onChange={setFilter} />
      </div>
      <Shy
        title="Area History"
        contentWidth={500}
        contentHeight={300}
        content={() => {
          return (
            <div style={{ position: "relative", top: -25 }}>
              <AreaHistory area={area} filter={filter} />
            </div>
          );
        }}
      />
      <Shy
        top={300}
        title="Prices"
        contentWidth={500}
        contentHeight={200}
        content={() => {
          return <Stats offers={offers} />;
        }}
      />
      <LowerBar
        {...{
          tab,
          offers,
          center,
          setCenter,
          setTab,
          zoom,
          setZoom,
          controllerState,
        }}
      />
    </div>
  );
};

// const Div = styled.div`
//   position: absolute;
//   left: 25px;
//   top: 20px;
//   right: 25px;
//   height: 300px;
//   background: rgba(255, 255, 255, 0.8);
//   overflow-y: auto;
// `;

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

// const clg = console.log;

// console.list = [];
// console.listeners = [];
// console.log = (...args) => {
//   clg(...args);
//   console.list.push(args);
//   if (console.list.length > 10) {
//     console.list.shift();
//   }
//   console.listeners.forEach((f) => f());
// };

// const Console = () => {
//   const [list, setList] = useState(console.list);
//   useEffect(() => {
//     console.listeners.push(() => {
//       setList([...console.list]);
//     });
//   }, []);
//   return list.map((args, i) => (
//     <pre style={{ fontSize: "small", margin: 0 }} key={i}>
//       {JSON.stringify(args.length == 1 ? args[0] : args, null, 2)}
//     </pre>
//   ));
// };

const FilterControl = ({ filter, onChange }) => {
  const [showFilter, setShowFilter] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowFilter(true);
        }}
      >
        filter: {filter.rooms.join(",")}&nbsp;rooms &lt;&nbsp;
        {filter.price[1]}
        &nbsp;$
      </button>
      {showFilter && (
        <div style={{ background: "white" }}>
          <OffersFilter
            filter={filter}
            onApply={(newFilter) => {
              saveFilter(newFilter);
              onChange(newFilter);
              setShowFilter(false);
            }}
            onCancel={() => {
              setShowFilter(false);
            }}
          />
        </div>
      )}
    </>
  );
};

const LowerBar = ({
  tab,
  offers,
  center,
  setCenter,
  setTab,
  zoom,
  setZoom,
  controllerState,
}) => {
  return (
    <>
      {tab == "list" && (
        <Window>
          <OffersTable offers={offers} />
        </Window>
      )}
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
          active={tab == "list"}
          onClick={() => {
            if (tab == "list") {
              setTab("");
            } else {
              setTab("list");
            }
          }}
        >
          List
        </MenuItem>
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
