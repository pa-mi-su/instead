module.exports = {
  preset: '@react-native/jest-preset',
  // Parallel React Native renderers can exhaust small CI runners and time out.
  maxWorkers: 1,
};
