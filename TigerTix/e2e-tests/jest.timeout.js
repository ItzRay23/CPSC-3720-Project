/**
 * Jest configuration for LLM service integration tests
 * Increases timeout for slow external API calls
 */

// Set test timeout to 120 seconds for LLM operations
jest.setTimeout(120000);