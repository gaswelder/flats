import React, { useState } from "react";

export const Shy = ({ title, contentWidth, contentHeight, content, top }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        position: "absolute",
        width: contentWidth,
        right: open ? 0 : -contentWidth,
        top: top || 100,
        transition: "right 0.5s",
      }}
    >
      <div
        style={{
          width: contentWidth,
          height: contentHeight,
          background: "rgba(255, 255, 255, 0.8)",
        }}
      >
        {open && content()}
      </div>
      <div
        style={{
          display: "block",
          background: "white",
          borderBottom: "1px solid #aaa",
          position: "absolute",
          bottom: 0,
          left: 0,
          padding: 10,
          borderRadius: "10px 10px 0 0",
          transform: "rotate(-90deg)",
          transformOrigin: "left bottom",
          cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        {title}
      </div>
    </div>
  );
};
