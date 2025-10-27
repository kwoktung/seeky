---
description: Generate a meaningful conventional commit message from staged and unstaged changes with context analysis
argument-hint: [optional context or specific focus area...]
allowed-tools: Bash(git diff:*)
---

# Task: Generate a Meaningful Conventional Commit Message

Analyze the code changes and generate a concise, descriptive commit message that follows the Conventional Commits specification (https://www.conventionalcommits.org/).

## Requirements:

1. **Follow Conventional Commits format**: `type(scope): description`
   - **Types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
   - **Scope**: optional, indicates the area of codebase affected
   - **Description**: imperative mood, lowercase, no period

2. **Analyze changes contextually**:
   - Identify the primary purpose of changes
   - Determine if it's a new feature, bug fix, refactoring, etc.
   - Consider breaking changes or significant updates
   - Note any UI/UX improvements for frontend changes

3. **Provide meaningful descriptions**:
   - Use imperative mood ("add feature" not "added feature")
   - Be specific about what changed
   - Include scope when changes affect specific components
   - Mention breaking changes with `BREAKING CHANGE:` footer

4. **Output format**:
   - Provide ONLY the commit message
   - No explanations or additional text
   - Include breaking change footers if applicable

## Examples of good commit messages:

- `feat(editor): add auto-save functionality`
- `fix(auth): resolve session timeout issue`
- `refactor(api): restructure service layer architecture`
- `perf(ui): optimize markdown rendering performance`
- `docs: update API documentation for new endpoints`

## Staged Changes:

```
!git diff --cached
```

## Unstaged Changes:

```
!git diff
```

## Optional User Context:

$ARGUMENTS
