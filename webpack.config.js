const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { default: Aurelia } = require('aurelia');

const cssLoader = 'css-loader';

module.exports = function (env, { analyze }) {
  const production = env === 'production' || process.env.NODE_ENV === 'production';
  return {
    mode: production ? 'production' : 'development',
    devtool: !production ? 'inline-source-map' : false,
    entry: {
      entry: './src/main.ts',
      detector: './src/detector/detector.ts',
      background: './src/background/background.ts',
      ['contentscript']: './src/contentscript/contentscript.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'build/[name].js',
      libraryTarget: 'var',
      library: '[name]'
    },
    resolve: {
      extensions: ['.ts', '.js'],
      modules: [path.resolve(__dirname, 'src'), 'node_modules']
    },
    devServer: {
      historyApiFallback: true,
      open: !process.env.CI,
      port: 9002,
      lazy: false
    },
    module: {
      rules: [
        { test: /\.(png|gif|jpg|cur)$/i, loader: 'url-loader', options: { limit: 8192 } },
        { test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff2' } },
        { test: /\.woff(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff' } },
        { test: /\.(ttf|eot|svg|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'file-loader' },
        { test: /\.css$/i, use: ['style-loader', cssLoader] },
        { test: /\.ts$/i, use: ['ts-loader', '@aurelia/webpack-loader'], exclude: /node_modules/ },
        { test: /\.html$/i, use: '@aurelia/webpack-loader', exclude: /node_modules/ }
      ]
    },
    optimization: {
      minimize: false
    },
    plugins: [
      new HtmlWebpackPlugin({ cache: false, template: 'index.html', chunks: ['entry'] }),
      analyze && new BundleAnalyzerPlugin(),
      new CopyPlugin({
        patterns: [
          { from: 'src/popups', to: 'popups' },
          { from: 'images', to: 'images' },
          { from: 'scripts', to: 'build' },
          { from: 'index-v1.html', to: '' },
          { from: 'manifest.json', to: '' },
          { from: 'src/devtools', to: '' },
        ],
      }),
    ].filter(p => p)
  }
}
