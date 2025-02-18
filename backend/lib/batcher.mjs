export const batcher = (size, flush) => {
  const items = [];
  return {
    async add(...xs) {
      for (const x of xs) {
        if (items.length > size) {
          await flush(items);
          items.length = 0;
        }
        items.push(x);
      }
    },
    async end() {
      if (items.length > 0) {
        await flush(items);
        items.length = 0;
      }
    },
  };
};
