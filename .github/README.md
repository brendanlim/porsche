# GitHub Integration Setup

## Claude for GitHub

This repository is configured to work with Claude for GitHub. To enable Claude reviews on your PRs:

### 1. Install the Claude GitHub App
Visit [github.com/marketplace/claude-for-github](https://github.com/marketplace/claude-for-github) and install the app for your repository.

### 2. Configure Repository Secret
Add your Anthropic API key as a repository secret:
- Go to Settings → Secrets and variables → Actions
- Add a new secret named `ANTHROPIC_API_KEY`
- Get your API key from [console.anthropic.com](https://console.anthropic.com)

### 3. Usage

#### Automatic PR Reviews
Claude will automatically review all new pull requests and provide feedback on:
- Code quality and TypeScript compliance
- Porsche model data accuracy
- Performance implications
- Security concerns

#### Manual Invocation
You can also invoke Claude manually by commenting on any PR or issue:
- `@claude review` - Request a code review
- `@claude help` - Get help with implementation
- `@claude explain [file/function]` - Get explanations

### 4. Customization
The `.github/claude.md` file contains specific instructions for Claude about this project. Update it to modify review criteria or add project-specific guidelines.

## GitHub Actions

The repository includes a workflow (`.github/workflows/claude-dev.yml`) that can be customized for additional automation tasks.