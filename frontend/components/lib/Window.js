import React from "react";
import styled from "styled-components";
import { styles } from "./Elements";

const Div = styled.div`
  position: absolute;
  left: 25px;
  top: 20px;
  bottom: 75px;
  overflow-y: auto;
  ${styles.sheet}
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
