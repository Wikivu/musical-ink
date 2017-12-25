const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: "./sound.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    devtool: 'source-map',
    module: {
        rules: [
            { test: /\.css$/, loader: "style-loader!css-loader" },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: { 
                        presets: [ '@babel/preset-env' ] 
                    } 
                }
            }
        ]
    },
    plugins: [ new UglifyJsPlugin() ]
};