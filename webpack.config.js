module.exports = {
    entry: "./js/sound.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    module: {
        rules: [
            { test: /\.css$/, loader: "style-loader!css-loader" },
            { test: /\.(vert|frag)$/, use: "raw-loader" },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: { 
                        presets: [ "@babel/preset-env" ] 
                    } 
                }
            }
        ]
    }
};