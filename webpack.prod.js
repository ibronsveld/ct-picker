// const path = require('path');
//
// module.exports = {
//   entry: './src/index.js',
//   output: {
//     filename: 'main.js',
//     path: path.resolve(__dirname, 'dist')
//   }
// };


const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    filename: 'ct-picker.min.js',
    path: path.resolve(__dirname, 'dist')
  },
});
