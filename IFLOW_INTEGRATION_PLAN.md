# iFlow AI Integration Plan - Full Replacement

## Overview
Replace GitHub Copilot backend with iFlow AI (OpenAI-compatible API)

**API Details:**
- Base URL: `https://apis.iflow.cn/v1`
- API Key: `sk-e0061e759a63804d4a9310ed5f1aae46`
- Model: `TBStars2-200B-A13B`
- Compatible with OpenAI SDK

## Phase 1: Core Language Model Service (CURRENT)

### 1.1 Create iFlow Language Model Provider
**File:** `src/vs/workbench/contrib/chat/common/iflowLanguageModelProvider.ts`
- Implement OpenAI-compatible API client
- Handle streaming responses
- Support tool calling
- Error handling and retries

### 1.2 Modify Language Models Service
**File:** `src/vs/workbench/contrib/chat/common/languageModels.ts`
- Remove GitHub Copilot provider registration
- Add iFlow provider as default
- Update model selection logic

### 1.3 Update Model Configuration
**File:** `src/vs/workbench/contrib/chat/common/languageModelsConfiguration.ts`
- Remove GitHub models
- Add iFlow models (TBStars2-200B-A13B)
- Update model metadata

## Phase 2: Remove Authentication Dependencies

### 2.1 Remove GitHub Authentication
**Files to modify:**
- `src/vs/workbench/services/chat/common/chatEntitlementService.ts`
- Remove GitHub OAuth flows
- Remove subscription checks
- Remove sign-up/login UI

### 2.2 Add iFlow API Key Management
**New file:** `src/vs/workbench/contrib/chat/common/iflowApiKeyService.ts`
- Store API key in secret storage
- Settings UI for API key input
- Validation

### 2.3 Update Context Keys
**File:** `src/vs/workbench/contrib/chat/common/actions/chatContextKeys.ts`
- Remove GitHub-specific context keys
- Add iFlow-specific keys

## Phase 3: Update UI/UX

### 3.1 Remove GitHub Branding
- Remove "GitHub Copilot" references
- Update to "Reasonance AI" or "iFlow AI"
- Update icons and logos

### 3.2 Update Settings
**File:** `src/vs/workbench/contrib/chat/common/chatConfiguration.ts`
- Remove GitHub Copilot settings
- Add iFlow settings (API key, model selection)

### 3.3 Update Welcome/Onboarding
- Remove GitHub sign-up flows
- Add API key setup flow

## Phase 4: Extension Dependencies

### 4.1 Remove Extension References
**Files:**
- `src/vs/workbench/services/assignment/common/assignmentFilters.ts`
- `src/vs/workbench/api/common/extHostChatAgents2.ts`
- Remove `github.copilot` and `github.copilot-chat` checks

### 4.2 Update Extension API
- Ensure third-party extensions can still use chat API
- Update documentation

## Phase 5: Testing & Validation

### 5.1 Core Functionality
- [ ] Chat responses work
- [ ] Streaming works
- [ ] Tool calling works
- [ ] Context handling works

### 5.2 Features
- [ ] Code completion
- [ ] Inline chat
- [ ] Chat panel
- [ ] Quick chat

### 5.3 Error Handling
- [ ] API errors
- [ ] Rate limiting
- [ ] Network failures

## Implementation Status

- [ ] Phase 1: Core Language Model Service
- [ ] Phase 2: Remove Authentication
- [ ] Phase 3: Update UI/UX
- [ ] Phase 4: Extension Dependencies
- [ ] Phase 5: Testing

## Notes

This is a complex replacement that will take significant time. Each phase should be tested before moving to the next.

**Estimated Time:** Several days of development + testing
**Risk Level:** High - many interconnected systems
**Recommendation:** Incremental implementation with frequent testing
