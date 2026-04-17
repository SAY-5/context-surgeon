import { platform } from 'node:os';

export function managedClaudeMdPath(): string | null {
  switch (platform()) {
    case 'darwin':
      return '/Library/Application Support/ClaudeCode/CLAUDE.md';
    case 'linux':
      return '/etc/claude-code/CLAUDE.md';
    case 'win32':
      return 'C:\\Program Files\\ClaudeCode\\CLAUDE.md';
    default:
      return null;
  }
}
