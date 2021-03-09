module.exports = {
    entry: "./js/sound.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    module: {
        rules: [
            { test: /\.css$/, use: ["style-loader", "css-loader"] },
            { test: /\.(vert|frag)$/, use: "raw-loader" },
        ]
    }
};
