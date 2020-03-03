import { useCallback, useEffect, useRef, useState } from "react";

export const useResource = (load, deps) => {
  const [data, setData] = useState();
  const [error, setError] = useState();
  const [ready, setReady] = useState(false);
  const reload = useCallback(() => {
    load()
      .then((data) => {
        setData(data);
        setReady(true);
      })
      .catch(setError);
  }, deps);
  useEffect(reload, [reload, ...deps]);
  return {
    reload,
    ready,
    data,
    error,
  };
};

export const useDebouncedCallback = (f, deps) => {
  const deb = useRef({ timeout: null }).current;
  return useCallback((...args) => {
    clearTimeout(deb.timeout);
    deb.timeout = setTimeout(() => {
      f(...args);
    }, 500);
  }, deps);
};
