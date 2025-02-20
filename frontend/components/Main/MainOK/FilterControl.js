import React, { useState } from "react";
import { saveFilter } from "../../../state";
import { OffersFilter } from "./OffersFilter";

export const FilterControl = ({ filter, onChange }) => {
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
