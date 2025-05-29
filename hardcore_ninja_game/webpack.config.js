const path = require("path");

module.exports = {
    mode: "production", // o 'development' si prefieres
    entry: "./hardcore_ninja_game/public/game.js",
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "public/dist"),
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
};
