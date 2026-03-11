module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './',
          },
          extensions: ['.ts', '.tsx', '.js', '.json'],
        },
      ],
    ],
    overrides: [
      {
        // Include @fastshot/* packages for env var inlining
        // babel-preset-expo skips node_modules, so we need this override
        include: /node_modules\/@fastshot\/(ai|auth)/,
        plugins: [
          [
            'transform-inline-environment-variables',
            {
              include: [
                'EXPO_PUBLIC_PROJECT_ID',
                'EXPO_PUBLIC_SUPABASE_URL',
                'EXPO_PUBLIC_SUPABASE_ANON_KEY',
                'EXPO_PUBLIC_NEWELL_API_URL',
                'EXPO_PUBLIC_AUTH_BROKER_URL',
              ],
            },
          ],
        ],
      },
    ],
  };
};