Please review the GitHub Pull Request: $ARGUMENTS.

Follow these steps:
1. Use `gh pr view $ARGUMENTS --web` or `gh pr view $ARGUMENTS --json title,body,author,files,comments,reviews` to get the PR details.
2. Analyze the changes introduced in the PR (files, code diffs, and commit messages).
3. Check if the PR follows React Native, Expo, and TypeScript best practices:

**Architecture & Structure:**
   - Proper separation of concerns (Components, Hooks, Services, Utils)
   - Single Responsibility Principle - each component/function has one clear purpose
   - Components are modular, reusable, and maintainable
   - Files are organized by feature, grouping related components, hooks, and styles
   - Feature-based directory structure (e.g., `user-profile/`, `chat-screen/`)
   - Types/interfaces are properly defined and separated from components

**Component Design:**
   - Functional components with hooks are used (not class components)
   - Components are properly typed with TypeScript interfaces for props
   - React.FC is used for functional components with props
   - Components are properly memoized with React.memo() when appropriate
   - Props are destructured appropriately
   - Component composition is used over prop drilling

**TypeScript Usage:**
   - TypeScript types are properly defined (avoid `any`)
   - Strict typing is enabled and followed
   - Interfaces are used for props and state
   - Types are precise and not overly generic
   - Type inference is used appropriately

**Performance Optimization:**
   - Minimized use of useEffect, useState, and heavy computations in render
   - React.memo() is used for components with static props
   - FlatLists are optimized with props like `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`
   - `getItemLayout` is used for FlatLists with consistent item sizes
   - Anonymous functions are avoided in `renderItem` or event handlers
   - Images are optimized using libraries like `react-native-fast-image`
   - Code splitting and lazy loading are used where appropriate

**State Management:**
   - State is lifted appropriately (not too high, not too low)
   - Context API is used appropriately for global state
   - State updates are batched when possible
   - No unnecessary re-renders
   - Async state updates are handled correctly

**Navigation:**
   - React Navigation is used correctly
   - Navigation types are properly defined
   - Deep linking is handled appropriately (if applicable)
   - Navigation state is managed correctly
   - Back button behavior is handled on Android

**Error Handling:**
   - Errors are caught and handled gracefully
   - User-friendly error messages are displayed
   - Network errors are handled appropriately
   - Async operations have proper error boundaries
   - Error states are properly displayed in UI

**Security:**
   - Sensitive data (API keys, tokens) are not hardcoded
   - Secure storage is used for sensitive data (e.g., `expo-secure-store`)
   - Input validation prevents injection attacks
   - Authentication tokens are handled securely
   - Deep links are validated to prevent security issues

**UI & Styling:**
   - Consistent styling using `StyleSheet.create()` or Styled Components
   - Responsive design considers different screen sizes and orientations
   - Styles are properly organized and reusable
   - Platform-specific styles are handled correctly (iOS vs Android)
   - Accessibility props are included where appropriate
   - Dark mode support is considered (if applicable)

**Code Quality:**
   - Consistent naming conventions (camelCase for variables/functions, PascalCase for components)
   - Directory names are lowercase and hyphenated (e.g., `user-profile`, `chat-screen`)
   - Code is DRY (Don't Repeat Yourself) - common logic is extracted
   - Unnecessary code and comments are removed
   - Follows coding standards and conventions from CLAUDE.md
   - Hooks follow the Rules of Hooks

**Performance:**
   - Async/await is used correctly
   - No blocking operations in render methods
   - Lists are virtualized (FlatList/SectionList) for large datasets
   - Images are optimized and properly sized
   - Animations are smooth and use native drivers when possible
   - Bundle size is considered

**Testing:**
   - Unit tests for components and hooks
   - Integration tests for user flows
   - E2E tests for critical user flows (if applicable)
   - Test coverage is maintained or improved
   - Tests are meaningful and test actual behavior
   - Snapshot tests are used appropriately (not overused)

**Documentation:**
   - Code comments explain "why" not "what"
   - README or component documentation is updated if needed
   - Complex logic has inline documentation
   - Environment variables are documented
   - Component props are self-documenting through TypeScript

**Expo-Specific:**
   - Expo APIs are used correctly
   - EAS Build configuration is updated if needed
   - OTA updates are handled appropriately (if applicable)
   - Native modules are properly configured (if used)
   - App.json/app.config.js is properly configured

**Other:**
   - Solves the issue it references
   - Has clear and meaningful commit messages
   - Passes linting and type checks
   - No console.log or debug code left in production code
   - Environment variables are properly used (not hardcoded)
   - No deprecated APIs or patterns are used

4. Provide a structured review with:
   - **Positives**: What was done well
   - **Potential Issues / Improvements**: Specific issues with code references
   - **Score x/10**: Overall quality score
   - **Questions for the Author**: Clarifications needed

5. Decide whether to **Approve**, **Request Changes**, or **Comment Only** using `gh pr review`:
   - `gh pr review $ARGUMENTS --approve --body "LGTM"`
   - `gh pr review $ARGUMENTS --request-changes --body "Please fix the following issues..."`
   - `gh pr review $ARGUMENTS --comment --body "General feedback..."`

6. Ensure all review comments are constructive and actionable. Include:
   - Specific file paths and line numbers
   - Code examples when suggesting improvements
   - References to React Native/Expo documentation when applicable

Remember: Always use the GitHub CLI (`gh`) for GitHub-related tasks.