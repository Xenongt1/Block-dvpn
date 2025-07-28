const webpack = require('webpack');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const env = dotenv.config({
  path: path.resolve(__dirname, '.env')
}).parsed || {};

module.exports = {
  webpack: function override(config) {
    // Add polyfills
    config.resolve.fallback = {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify'),
      url: require.resolve('url'),
      buffer: require.resolve('buffer'),
      process: require.resolve('process/browser')
    };

    // Add plugins
    config.plugins = (config.plugins || []).concat([
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer']
      }),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(process.env)
      })
    ]);

    // Add resolve extensions
    config.resolve.extensions = [...(config.resolve.extensions || []), ".ts", ".js"];

    // Ignore source map warnings
    config.ignoreWarnings = [/Failed to parse source map/];

    // Add node polyfills
    config.resolve.alias = {
      ...config.resolve.alias,
      'crypto': 'crypto-browserify',
      'stream': 'stream-browserify',
      'assert': 'assert',
      'http': 'stream-http',
      'https': 'https-browserify',
      'os': 'os-browserify/browser',
      'process': 'process/browser',
    };

    return config;
  },
  devServer: function overrideDevServer(config) {
    config.host = '172.20.10.2';
    return config;
  }
}; 