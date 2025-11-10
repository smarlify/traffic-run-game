module.exports = {
  e2e: {
    baseUrl: 'http://localhost:4173',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
  },
};
