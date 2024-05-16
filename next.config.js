// This allows the assets to be reached by chrome
export default {
  assetPrefix: process.env.NODE_ENV === "production" ? "/out" : "",
  images: { unoptimized: true },
  output: "export",
};
