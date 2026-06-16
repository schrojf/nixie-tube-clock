// Rspack's asset modules resolve image imports to a URL string
// (see the asset rule in rspack.config.ts).
declare module '*.png' {
  const src: string;
  export default src;
}
