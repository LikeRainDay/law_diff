# Frontend Documentation (Next.js)

The frontend of Law Compare is a modern web application built with Next.js 14, designed to provide a fluid and responsive interface for comparing legal texts.

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx           # Main application logic and state management
│   ├── layout.tsx         # Root layout (HTML shell)
│   └── globals.css        # Global styles (Tailwind CSS)
├── components/
│   ├── ui/                # Reusable UI components (buttons, cards, etc.)
│   ├── diff/              # Diff visualization components
│   │   ├── GitDiffView.tsx       # Standard line-by-line diff
│   │   ├── SideBySideView.tsx    # Split view with synchronized scrolling
│   │   └── DiffResultViewer.tsx  # Container for switching views
│   └── legal/             # Legal-specific components (e.g., EntityHighlight)
└── lib/
    ├── diff-utils.ts      # API client and helper functions
    └── types.ts           # TypeScript definitions for Diff data
```

## Core Logic & Data Flow

### 1. State Management (`app/page.tsx`)
The main page acts as the central controller. It manages:
- **Input State**: `oldText` and `newText` from user input.
- **Diff Data**: `diffResult` fetched from the backend.
- **View Configuration**: `viewMode` (Git vs. Side-by-Side), `language` (i18n), and advanced settings like `alignThreshold`.

### 2. Comparison Process
1. **User Action**: User enters text and clicks "Start Comparison".
2. **API Call**: `handleCompare` calls `compareLegalTextsAsync`.
   - It sends `old_text` and `new_text` to the Rust backend (`/api/compare`).
   - It can request structural analysis or simple line diffs.
3. **Lazy Loading**:
   - Initial comparison might be fast (Git mode).
   - If the user switches to "Structure View", the app lazily fetches the heavier structural analysis data if it wasn't already loaded.

### 3. Visualization

#### Git Mode (`GitDiffView`)
Renders changes line-by-line.
- **Additions** are green.
- **Deletions** are red.
- **Modifications** are shown by pairing deletion and addition lines.

#### Side-by-Side Mode (`SideBySideView`)
Renders two panes (Old vs. New).
- **Alignment**: Uses anchors to ensure corresponding paragraphs stay aligned even when content differs in length.
- **Synchronized Scrolling**: Scrolling one pane automatically scrolls the other to keep context.

## Screenshots

> *[Placeholder: Screenshot of the main input interface with "Old Text" and "New Text" areas]*
>
> *[Placeholder: Screenshot of the "Side-by-Side" comparison view showing highlighted differences]*

## Localization
The app features a built-in localization helper (`t` function) supporting English (`en`) and Chinese (`zh`). This allows seamless switching between languages for international usability.

## Styling
- **Tailwind CSS**: Used for all styling.
- **Theming**: Supports Dark/Light mode via `next-themes`.
- **Animations**: `framer-motion` is used for smooth transitions between views.
