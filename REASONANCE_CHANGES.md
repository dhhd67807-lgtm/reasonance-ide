# Reasonance Customization Changes

This document tracks all customizations made to rebrand VS Code as "Reasonance".

## Branding Changes

### Product Configuration
- **File**: `product.json`
  - Changed `nameShort`, `nameLong`, `applicationName` to "Reasonance"
  - Updated data folder names, bundle identifiers, URL protocols

- **File**: `package.json`
  - Changed package name to "reasonance-dev"
  - Updated author to "Reasonance"

## Theme & UI Changes

### Color Scheme - Magenta/Pink Accent
All blue accent colors (`#007ACC`, `#0078D4`, `#005FB8`) replaced with magenta (`#D946EF`):

- **File**: `extensions/theme-defaults/themes/dark_vs.json`
  - `activityBarBadge.background`: #007ACC → #D946EF
  - `menu.selectionBackground`: #0078d4 → #D946EF
  - Editor background: #1E1E1E → #000000 (solid black)
  - All major UI areas set to solid black (#000000)

- **File**: `src/vs/workbench/services/themes/common/workbenchThemeService.ts`
  - Updated all blue colors in `COLOR_THEME_DARK_INITIAL_COLORS`:
    - `activityBar.activeBorder`
    - `activityBarBadge.background`
    - `button.background`
    - `editorGutter.modifiedBackground`
    - `focusBorder`
    - `menu.selectionBackground`
    - `panelTitle.activeBorder`
    - `progressBar.background`
    - `statusBar.debuggingBackground`
    - `statusBar.focusBorder`
    - `statusBarItem.focusBorder`
    - `statusBarItem.remoteBackground`
    - `tab.activeBorderTop`
    - `terminal.tab.activeBorder`
    - `welcomePage.progress.foreground`

- **File**: `src/vs/workbench/common/theme.ts`
  - `ACTIVITY_BAR_BADGE_BACKGROUND`: #007ACC → #D946EF
  - `STATUS_BAR_BACKGROUND`: #007ACC → #D946EF

### Logo & Icons
- **File**: `src/vs/workbench/browser/parts/editor/media/letterpress-dark.svg`
  - Created Reasonance checkmark logo (white)

- **File**: `src/vs/workbench/browser/parts/editor/media/letterpress-light.svg`
  - Created Reasonance checkmark logo (black)

- **Generated Icons**:
  - `resources/darwin/code.icns` (macOS)
  - `resources/win32/code.ico` (Windows)
  - `resources/linux/code.png` (Linux)

### Activity Bar & UI Elements
- **File**: `src/vs/workbench/contrib/chat/browser/chatParticipant.contribution.ts`
  - Chat view icon changed to Reasonance logo

- **File**: `src/vs/workbench/browser/parts/activitybar/media/activityaction.css`
  - Added CSS override for chat icon with white Reasonance logo (56px)

- **File**: `src/vs/workbench/browser/parts/panel/panelActions.ts`
  - Panel toggle icon changed to star icon (`Codicon.starFull`)

- **File**: `src/vs/workbench/browser/parts/auxiliarybar/auxiliaryBarActions.ts`
  - Auxiliary bar toggle icons changed to sparkle

- **File**: `src/vs/workbench/browser/parts/titlebar/media/titlebarpart.css`
  - Added CSS override for auxiliary bar toggle with white Reasonance logo (40px)

### Welcome Screen
- **File**: `src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts`
  - Changed default `workbench.startupEditor` from `'welcomePage'` to `'none'`

- **File**: `src/vs/workbench/contrib/chat/browser/widget/chatWidget.ts`
  - Welcome title changed to "Hi How are you"
  - Subtitle set to "Code Freely"
  - Removed chat icon, disclaimer, and extra content

- **File**: `src/vs/workbench/contrib/chat/browser/viewsWelcome/chatViewWelcomeController.ts`
  - Simplified welcome message generation
  - Removed instruction file checks

- **File**: `src/vs/workbench/contrib/chat/browser/widget/media/chatViewWelcome.css`
  - Added bold shimmer animation to title (40px, font-weight 800)
  - Styled subtitle (14px, 60% opacity)
  - Hidden icon, disclaimer, tips, and suggested prompts

## Text Replacements (VS Code → Reasonance)

Updated user-facing text in the following files:
- `src/vs/workbench/electron-browser/desktop.contribution.ts`
- `src/vs/workbench/contrib/localization/common/localizationsActions.ts`
- `src/vs/workbench/services/userDataProfile/browser/userDataProfileManagement.ts`
- `src/vs/workbench/browser/workbench.contribution.ts`
- `src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts`
- `src/vs/workbench/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode.ts`
- `src/vs/workbench/contrib/issue/browser/baseIssueReporterService.ts`
- `src/vs/workbench/common/contextkeys.ts`
- `src/vs/workbench/browser/actions/helpActions.ts`

## Development Setup

### Node.js Version
- Using Node.js v22.21.1 (specified in `.nvmrc`)

### Build Commands
- Install dependencies: `npm install`
- Start watch mode: `npm run watch`
- Run application: `./scripts/code.sh` (or platform equivalent)

## Notes
- All changes maintain compatibility with the VS Code extension ecosystem
- The magenta/pink color (#D946EF) provides a distinctive brand identity
- Solid black background (#000000) creates a premium, modern aesthetic
- Reasonance logo uses a simple checkmark design for clarity
