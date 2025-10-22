// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@': './src',     // => "@/x" betyder "src/x"
        },
        extensions: ['.tsx', '.ts', '.js', '.json'],
      }],
    ],
  };
};