# Commit Message Guidelines

## Critical Requirements

**ALL commits MUST follow these guidelines without exception.** These rules apply to both human developers and AI assistants working on this codebase.

## The Golden Rule

**Every commit message must accurately and completely describe ALL changes included in that commit.**

Never:
- ❌ Use misleading commit messages that omit major changes
- ❌ Combine unrelated changes in a single commit
- ❌ Write vague messages like "fix bugs" or "update code"
- ❌ Omit important features from the commit description

## Commit Message Format

### Structure

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type (Required)

Must be one of:

- **feat**: A new feature (user-facing or internal)
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Build process, dependency updates, tooling changes
- **revert**: Reverting a previous commit

### Scope (Optional but Recommended)

The scope indicates what part of the codebase is affected:
- `colors`: Color system and themes
- `auth`: Authentication
- `api`: API changes
- `ui`: User interface components
- `db`: Database changes
- etc.

### Subject Line (Required)

- **Maximum 72 characters**
- **Start with lowercase** (except proper nouns)
- **No period at the end**
- **Imperative mood** ("add" not "added" or "adds")
- **Must accurately describe the primary change**

### Body (Required for Non-Trivial Changes)

The body MUST:

1. **List ALL significant changes** made in the commit
2. **Explain WHY the change was made**, not just what changed
3. **Include technical details** that would help someone understand the commit
4. **Mention breaking changes** if any
5. **Reference related issues** if applicable

Format:
- Wrap at 72 characters
- Use bullet points for multiple changes
- Separate paragraphs with blank lines
- Be as detailed as necessary

### Footer (Optional)

- Breaking changes: `BREAKING CHANGE: description`
- Issue references: `Fixes #123`, `Closes #456`
- Co-authors: `Co-Authored-By: Name <email@example.com>`

## Examples

### ✅ GOOD: Complete and Accurate

```
feat(colors): add rainbow color theme with gradient swatch

Implemented a vibrant rainbow color theme for the Org Map with the
following changes:

- Added rainbow theme to colors.ts with 7 vibrant colors (red, orange,
  yellow, green, cyan, blue, purple)
- Implemented cycling logic in getDepthColors() for hierarchies deeper
  than 7 levels using modulo operator
- Updated ThemePicker.tsx to display a conic gradient swatch for the
  rainbow theme instead of solid color
- Added 4 comprehensive tests for rainbow theme cycling behavior
- Configured appropriate text contrast (white/dark) for accessibility

The gradient smoothly transitions through all rainbow colors, making
it immediately recognizable in the theme picker. Colors automatically
cycle for organizations with more than 7 depth levels.

All 162 tests passing. Code formatted with Prettier and passes ESLint.
```

### ❌ BAD: Misleading and Incomplete

```
debug: add version endpoint to verify deployment

Adds /api/version endpoint to check which code version is running.
This helps diagnose deployment sync issues.
```

**Problem**: This commit message completely omits that it also includes the entire rainbow theme implementation. This is unacceptable.

### ✅ GOOD: Bug Fix with Details

```
fix(search): prevent SQL injection in search queries

Fixed critical security vulnerability where user input was not properly
sanitized before being used in FTS queries.

Changes:
- Added parameterized queries for all search endpoints
- Implemented input validation and escaping
- Added 15 new security tests for SQL injection attempts
- Updated search service to use prepared statements

Security Impact: HIGH - prevents potential data exposure
```

### ❌ BAD: Vague and Unhelpful

```
fix: fix search bugs
```

**Problem**: Doesn't explain what bugs, what was fixed, or the impact.

## Multi-Change Commits

If a commit contains multiple related changes, **ALL must be listed**:

```
feat(ui): improve theme picker usability

Multiple improvements to the theme picker component:

1. Rainbow theme swatch
   - Changed from solid red to conic gradient
   - Shows all 7 rainbow colors in the swatch
   - Makes rainbow theme immediately recognizable

2. Theme selection feedback
   - Added subtle scale animation on hover
   - Improved ring indicator for selected theme
   - Better visual contrast in dark mode

3. Accessibility
   - Added proper ARIA labels
   - Improved keyboard navigation
   - Added tooltip with theme names

Tested across all 7 themes. All existing tests passing.
```

## Pre-Commit Checklist

Before committing, verify:

- [ ] Commit message accurately describes **ALL** changes
- [ ] Subject line is under 72 characters
- [ ] Body explains the "why" and "what"
- [ ] All features/changes are listed
- [ ] Breaking changes are documented
- [ ] Tests are mentioned if added/modified
- [ ] Conventional commit format is used
- [ ] No misleading or vague language

## Integration with AI Assistants

When working with AI assistants (Claude, ChatGPT, etc.):

1. **Always review commit messages** before pushing
2. **Demand detailed messages** that list all changes
3. **Reject vague or misleading messages** immediately
4. **Ensure AI lists everything** changed in the commit body

AI assistants MUST:
- Review all file changes before writing commit message
- List every significant change made
- Never use generic messages
- Never omit features from the description
- Follow these guidelines exactly

## Enforcement

Commits that violate these guidelines:
- Will be rejected in code review
- Must be amended or rewritten
- May require rebasing to fix commit history

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)

---

**Remember**: Commit messages are permanent documentation of your project's history. Make them count.
