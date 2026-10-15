export const batcher = (
  size: number,
  flush: (items: any[]) => Promise<void>
) => {
  const items: any[] = [];
  return {
    async add(...xs: any[]) {
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
