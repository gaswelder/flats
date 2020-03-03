export const diff = (lefts, rights, key) => {
  const rightMap = new Map(rights.map((x) => [key(x), x]));
  const leftMap = new Map(lefts.map((x) => [key(x), x]));
  return {
    onlyLeft: lefts.filter((x) => !rightMap.has(key(x))),
    onlyRight: rights.filter((x) => !leftMap.has(key(x))),
    both: lefts
      .map((left) => ({ left, right: rightMap.get(key(left)) }))
      .filter((x) => x.right),
  };
};
