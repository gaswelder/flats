import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { API } from "../../../api";
import { Clusters, Pin, SlippyMap } from "../../../rsm/index";
import { getSetting, loadFilter, saveFilter, setSetting } from "../../../state";
import { Shy } from "../../lib/Shy";
import { clamp, useDebouncedCallback } from "../../util";
import { AreaHistory } from "./AreaHistory";
import { FavoriteLocations } from "./FavoriteLocations";
import { Filter, FilterBalloon } from "./Filter";
import { LocationBalloon } from "./Location";
import { OfferMapTooltip } from "./OfferMapTooltip";
import { OffersBox } from "./OffersBox";
import { Stats } from "./Stats";
import { Zoomer } from "./Zoomer";

const rootDivStyle = {
  position: "absolute",
  inset: 0,
};

const stop = (e) => {
  e.stopPropagation();
};

export const MainOk = () => {
  const [filter, setFilter] = useState(loadFilter());
  const [offers, setOffers] = useState([]);
  const [selectedOffers, setSelectedOffers] = useState(null);
  const [area, setArea] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const $loadOffers = useDebouncedCallback(
    (area) => {
      setArea(area);
      setSetting("defaultCenter", area.center);
      API.fetchOffers(
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
      controllerState.zoomSpeed = -event.deltaY / 2000;
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
          <Pin coords={selectedOffers.coords} onClick={stop}>
            <OfferMapTooltip offers={selectedOffers.list} />
          </Pin>
        )}
      </SlippyMap>
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
        contentWidth={400}
        contentHeight={200}
        content={() => {
          return <Stats offers={offers} />;
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 60,
          display: "flex",
          gap: 5,
        }}
      >
        <FilterBalloon
          filter={filter}
          onClick={() => setShowFilter(!showFilter)}
          style={showFilter ? { backgroundColor: "#ddd" } : {}}
        />
        <LocationBalloon
          center={center}
          onClick={() => setLocationOpen(!locationOpen)}
          style={locationOpen ? { backgroundColor: "#ddd" } : {}}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 125,
        }}
      >
        {showFilter && (
          <Filter
            filter={filter}
            onApply={(newFilter) => {
              setFilter(newFilter);
              saveFilter(newFilter);
              setShowFilter(false);
            }}
            onCancel={() => {
              setShowFilter(false);
            }}
          />
        )}
        {locationOpen && (
          <FavoriteLocations
            center={center}
            onSelect={(coords) => {
              setCenter(coords);
              setLocationOpen(false);
            }}
            onCloseClick={() => setLocationOpen(false)}
          />
        )}
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <Zoomer
          value={zoom}
          onChange={(newzoom) => {
            setZoom(newzoom);
            clearTimeout(controllerState.zoomTimer);
          }}
        />
      </div>
    </div>
  );
};
