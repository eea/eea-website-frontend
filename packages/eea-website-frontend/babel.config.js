module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['@plone/razzle'],
    plugins: [
      [
        'react-intl',
        {
          messagesDir: './build/messages/',
        },
      ],
    ],
  };
};
