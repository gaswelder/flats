declare module "dotenv" {
  export function config(options?: any): void;
  const _default: { config: typeof config; [key: string]: any };
  export default _default;
}

declare module "haversine-distance" {
  const haversine: (
    a: { lat: number; lon: number },
    b: { lat: number; lon: number }
  ) => number;
  export default haversine;
}

declare module "node-mailjet" {
  const mailjet: any;
  export default mailjet;
}
