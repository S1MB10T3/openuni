/* global process __dirname */
/* eslint quotes: 0 */
/* eslint no-template-curly-in-string: 0 */
require('dotenv').config({ silent: true });

const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const gitHash = require('helper-git-hash');

const { NODE_ENV } = process.env;
const IS_PRODUCTION = NODE_ENV === 'production';

// eslint-disable-next-line no-console
console.log(`Bundling for ${(NODE_ENV || 'development').toUpperCase()}`);


module.exports = {
  devtool: !IS_PRODUCTION && 'cheap-module-source-map',
  entry: {
    main: [
      'bootstrap/dist/css/bootstrap.css',
      'babel-polyfill',
      'isomorphic-fetch',
      path.resolve(__dirname, 'src/css/main.scss'),
      path.resolve(__dirname, 'src/client.jsx'),
    ],
  },
  output: {
    path: path.resolve(__dirname, './public/assets'),
    filename: IS_PRODUCTION ? '[name].[chunkhash].js' : '[name].js',
    chunkFilename: '[name].[chunkhash].js',
    publicPath: '/assets/',
    crossOriginLoading: 'anonymous',
  },
  devServer: {
    contentBase: path.join(__dirname, './public'),
    host: '0.0.0.0',
    port: process.env.PORT || 3000,
    historyApiFallback: true,
    watchOptions: {
      aggregateTimeout: 100,
    },
  },
  cache: true,
  stats: {
    colors: true,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.scss', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'eslint-loader',
        enforce: 'pre',
      },
      {
        test: /\.jsx?$/,
        include: path.resolve(__dirname, 'src'),
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          forceEnv: NODE_ENV || 'development',
        },
      },
      {
        test: /\.s?css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            { loader: 'css-loader', options: { importLoaders: 1 } },
            { loader: 'postcss-loader',
              options: {
                plugins: () => {
                  require('autoprefixer')({
                    browsers: ['last 2 versions'],
                  });
                },
              },
            },
            { loader: 'sass-loader' },
          ],
        }),
      },
      {
        test: /\.(eot|woff|woff2|ttf|png|jpg|svg|gif)/,
        use: ['url-loader?limit=30000&name=[name]-[hash].[ext]'],
      },
    ],
  },
  plugins: [
    new webpack.LoaderOptionsPlugin({
      debug: !IS_PRODUCTION,
      minimize: IS_PRODUCTION,
    }),
    new (require('html-webpack-plugin'))({
      template: './src/index.ejs',
      filename: '../index.html',
      chunksSortMode: 'none',
      inject: true,
      minify: {
        minifyCSS: true,
        minifyJS: true,
        collapseWhitespace: IS_PRODUCTION,
      },
    }),
    new (require('webpack-subresource-integrity'))({
      hashFuncNames: ['sha256', 'sha384'],
      enabled: IS_PRODUCTION,
    }),
    new webpack.DefinePlugin(Object.assign({
      'process.env.NODE_ENV': `"${NODE_ENV}"`,
      'API': process.env.API ? `"${process.env.API}"` : "'/api'",
      'API_WS': process.env.API_WS ? `"${process.env.API_WS}"` : undefined,
      'JWT_NAME': process.env.JWT_NAME ? `"${process.env.JWT_NAME}"` : "'jwt'",
      'GITHUB_URL': process.env.GITHUB_URL ? `"${process.env.GITHUB_URL}"` : "'https://github.com/ILiedAboutCake/Rustla2'",
      'DISCORD_URL': process.env.DISCORD_URL ? `"${process.env.DISCORD_URL}"` : "'https://discord.gg/qucCTxN'",
      'DONATE_PAYPAL_URL': process.env.DONATE_PAYPAL_URL ? `"${process.env.DONATE_PAYPAL_URL}"` : undefined,
      'DONATE_LINODE_URL': process.env.DONATE_LINODE_URL ? `"${process.env.DONATE_LINODE_URL}"` : undefined,
      'DONATE_DO_URL': process.env.DONATE_DO_URL ? `"${process.env.DONATE_DO_URL}"` : undefined,
      'GIT_COMMIT_HASH': `"${gitHash()}"`,
      'GIT_SHORT_COMMIT_HASH': `"${gitHash({ short: true })}"`,
    }, (() => IS_PRODUCTION ? {
      // production-only global defines
    } : undefined)())),
    new webpack.optimize.AggressiveMergingPlugin(),
    new ExtractTextPlugin(IS_PRODUCTION ? 'css/[name].[contenthash].css' : 'css/[name].css'),

    // production-only plugins
    ...(() => IS_PRODUCTION ? [
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
        },
      }),
    ] : [])(),
  ].filter(Boolean),
};
