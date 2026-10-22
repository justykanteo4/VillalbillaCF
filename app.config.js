const { iosUrlScheme } = require('./native-google-config.cjs');

module.exports = ({ config }) => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!clientId) return config;
  return {
    ...config,
    plugins: config.plugins.map(plugin => {
      if (Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin') {
        return [plugin[0], { ...plugin[1], iosUrlScheme: iosUrlScheme(clientId) }];
      }
      return plugin;
    }),
  };
};
