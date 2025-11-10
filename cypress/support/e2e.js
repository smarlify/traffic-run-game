// Cypress e2e support file
// Add custom commands and global configurations here

// Disable uncaught exception handling for game-related errors
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false prevents Cypress from failing the test
  return false;
});
