require('dotenv').config();

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
      [
        'transform-inline-environment-variables',
        {
          include: [
            'EXPO_PUBLIC_PROJECT_ID',
            'EXPO_PUBLIC_SUPABASE_URL',
            'EXPO_PUBLIC_SUPABASE_ANON_KEY',
          ],
        },
      ],
    ],
    overrides: [
      {
        // Inline env vars inside @fastshot/ai (node_modules is skipped by default)
        include: /node_modules\/@fastshot\/ai/,
        plugins: [
          [
            'transform-inline-environment-variables',
            {
              include: [
                'EXPO_PUBLIC_PROJECT_ID',
                'EXPO_PUBLIC_SUPABASE_URL',
                'EXPO_PUBLIC_SUPABASE_ANON_KEY',
              ],
            },
          ],
        ],
      },
    ],
  };
};