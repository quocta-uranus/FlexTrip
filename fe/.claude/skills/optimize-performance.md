# Performance Optimization Command

Optimize the React component at: $ARGUMENTS

## Role
You are a senior frontend engineer specialized in React performance optimization for this Next.js 15 monorepo project.

## Goal
Optimize the given component for:
- Rendering performance
- Memory usage
- Avoid unnecessary re-renders
- Improve user experience (smooth, responsive)

## Tasks
1. Read and analyze the component file
2. Identify performance issues
3. Refactor the code following project standards
4. Explain improvements with clear reasoning

## Focus Areas

### 1. Rendering Optimization
- Avoid unnecessary re-renders
- Use React.memo when appropriate
- **Use useMemo / useCallback correctly** (follow CLAUDE.md: "When writing functions, you must use useCallback" and "When performing calculations or rendering JSX, you must use useMemo")
- Avoid inline functions in JSX when harmful

### 2. State Management
- Avoid unnecessary state
- Minimize state updates
- Use Context providers appropriately (this project uses Context, not Zustand)

### 3. Expensive Calculations
- Memoize heavy computations with useMemo
- Move logic outside render if possible

### 4. Lists & Rendering
- Use key properly
- Use virtualization when needed (AG Grid, React Data Grid)
- Avoid rendering large lists without optimization

### 5. Effects
- **Avoid useEffect unless absolutely necessary** (per CLAUDE.md)
- Remove unnecessary useEffect
- Avoid redundant API calls
- Clean up side effects properly

### 6. API Calls & Data Fetching
- **Use SWR for API calls** (per CLAUDE.md: "When implementing APIs, you must use SWR to cache data")
- Skeleton should only load on first render (per CLAUDE.md)
- Avoid unnecessary revalidation

### 7. Styling
- **When className contains interpolation/template literals, MUST use cn() from @monorepo/ui**
- Add 'cursor-pointer' to clickable elements

### 8. Code Splitting
- Suggest dynamic import if component is heavy
- Use Next.js dynamic imports with proper loading states

### 9. UX Performance
- Avoid blocking UI thread
- Suggest skeleton/loading strategy if needed
- Improve perceived performance

## Architecture Improvement

When refactoring, enforce separation of concerns for non-trivial components:

### Structure
Split UI and logic into separate files:

```
ComponentName.tsx           // UI layer (presentation)
useComponentName.hook.ts    // Logic layer (state, effects, business logic)
```

### Rules

**UI Layer (ComponentName.tsx):**
- Only responsible for rendering UI
- Should be as "dumb" as possible
- No heavy logic inside component
- Receive data & handlers from custom hook

**Logic Layer (useComponentName.hook.ts):**
- Handle state, side effects, business logic
- Optimize performance (memo, callback, etc.)
- Encapsulate reusable logic
- All useCallback, useMemo, useEffect should live here

### When to Apply
- Component has medium to high complexity
- Contains business logic or multiple states
- Needs optimization or reuse
- **DO NOT over-engineer** for very small/simple components

## Project-Specific Standards

Follow the project's coding standards from CLAUDE.md:
- Do not compare directly with string literals — define constants first
- When adding clickable elements, must have 'cursor-pointer' CSS
- Use path aliases: `@/` for app-local imports, `@monorepo/*` for packages
- Import UI components from `@monorepo/ui` when possible
- Follow atomic design pattern for shared components

## Constraints
- DO NOT change business logic
- DO NOT break existing behavior
- Keep code readable and maintainable
- Follow TypeScript strict mode
- Maintain existing import patterns

## Output Format

### 1. Analysis
- List all performance issues found
- Categorize by severity (Critical, High, Medium, Low)

### 2. Optimized Code
- Provide full updated code
- Split into separate files if applying architecture improvement
- Include all imports and types

### 3. Explanation
- Explain each improvement clearly
- Why it improves performance
- Reference specific React/Next.js concepts
- Mention alignment with CLAUDE.md standards

### 4. Trade-offs
- Mention any trade-offs if applicable
- Performance vs readability considerations
- When NOT to apply certain optimizations

### 5. Testing Recommendations
- Suggest what to test after optimization
- Any potential edge cases to watch for
