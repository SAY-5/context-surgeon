// Type shim for the optional peer dependency `@anthropic-ai/sdk`.
// The SDK is only loaded at runtime when ANTHROPIC_API_KEY is set; this shim
// lets the project build without the package being installed.
declare module '@anthropic-ai/sdk';
