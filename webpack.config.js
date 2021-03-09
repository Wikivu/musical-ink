const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  entry: "./src/sound.js",
  output: {
    path: path.join(__dirname, "dist"),
    filename: "bundle.js",
  },
  devtool: "source-map",
  module: {
    rules: [
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      { test: /\.(vert|frag)$/, use: "raw-loader" },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public", to: "dist" }],
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, "public"),
  },
};
