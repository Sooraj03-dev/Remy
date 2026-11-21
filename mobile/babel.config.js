module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
            '@components': './components',
            '@constants': './constants',
            '@hooks': './hooks',
            '@shared': '../shared/types',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      // Must stay last (Reanimated 3 requirement).
      'react-native-reanimated/plugin',
    ],
  };
};
