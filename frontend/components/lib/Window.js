import React from "react";
import styled from "styled-components";

const Div = styled.div`
  position: absolute;
  left: 25px;
  top: 20px;
  bottom: 75px;
  background: rgba(255, 255, 255, 0.9);
  overflow-y: auto;
  padding: 20px;
`;

export const Window = ({ children, onClose }) => {
  return (
    <Div>
      {onClose && (
        <button
          style={{ position: "absolute", right: 10, top: 10 }}
          onClick={onClose}
        >
          &times;
        </button>
      )}
      {children}
    </Div>
  );
};
