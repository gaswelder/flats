import React from "react";
import styled from "styled-components";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  & nav {
    background-color: #f4f5f7;
  }
  & nav a {
    color: #172b4d;
    font-weight: bold;
    border: 1px solid #dfe1e6;
    text-decoration: none;
    padding: 10px;
    background-color: #dfe1e6;
    font-size: 14px;
    display: inline-block;
  }
  & nav a.current {
    background-color: white;
    border-bottom-color: white;
  }
`;

const PanelsContainer = styled.div`
  overflow-y: scroll;
  flex: 1;
  display: flex;
  & > div {
    margin-bottom: 100px;
  }
`;

const hide = {
  display: "none",
};

export const Tabs = ({ panels }) => {
  const [tab, setTab] = React.useState(0);
  const [mountedTabs, setMountedTabs] = React.useState([0]);
  const containerRef = React.useRef();
  return (
    <Root>
      <nav>
        {panels.map((panel, i) => (
          <React.Fragment key={i}>
            <a
              className={tab === i ? "current" : ""}
              onClick={(event) => {
                event.preventDefault();
                if (!mountedTabs.includes(i)) {
                  setMountedTabs(mountedTabs.concat([i]));
                }
                setTab(i);
              }}
              href="#"
            >
              {panel.title}
            </a>{" "}
          </React.Fragment>
        ))}
      </nav>
      <PanelsContainer ref={containerRef}>
        {panels.map(
          (panel, i) =>
            mountedTabs.includes(i) && (
              <div
                key={i}
                style={
                  tab === i
                    ? { flex: "1", flexDirection: "column", display: "flex" }
                    : hide
                }
              >
                {panel.content}
              </div>
            )
        )}
      </PanelsContainer>
    </Root>
  );
};
