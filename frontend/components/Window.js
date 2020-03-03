import React from "react";
import styled from "styled-components";

const Div = styled.div`
  position: absolute;
  left: 25px;
  top: 20px;
  right: 25px;
  bottom: 75px;
  background: rgba(255, 255, 255, 0.8);
  overflow-y: auto;
`;

export const Window = ({ children }) => {
  return <Div>{children}</Div>;
};
