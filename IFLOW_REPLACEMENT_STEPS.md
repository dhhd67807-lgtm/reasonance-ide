# iFlow Full Replacement - Implementation Steps

## Critical Files to Modify (In Order)

### Phase 1: Core Language Model Integration ✓ IN PROGRESS

1. ✅ **Created:** `src/vs/workbench/contrib/chat/common/iflowLanguageModelProvider.ts`
   - iFlow API client implementation

2. **Modify:** `src/vs/workbench/contrib/chat/common/languageModels.ts`
   - Register iFlow provider in LanguageModelsService constructor
   - Remove GitHub Copilot provider registration
   - Set iFlow as default

3. **Modify:** `src/vs/workbench/contrib/chat/common/languageModelsConfiguration.ts`
   - Add iFlow vendor configuration
   - Remove GitHub Copilot vendor

### Phase 2: Remove GitHub Authentication

4. **Modify:** `src/vs/workbench/services/chat/common/chatEntitlementService.ts`
   - Remove all GitHub OAuth code
   - Remove subscription/entitlement checks
   - Simplify to just check for iFlow API key

5. **Modify:** `src/vs/workbench/services/accounts/browser/defaultAccount.ts`
   - Remove GitHub account integration

6. **Delete/Disable:** GitHub authentication extensions
   - `extensions/github-authentication/`

### Phase 3: Remove GitHub Copilot References

7. **Modify:** `src/vs/workbench/services/assignment/common/assignmentFilters.ts`
   - Remove Copilot extension version checks
   - Remove Copilot SKU checks

8. **Modify:** `src/vs/workbench/api/common/extHostChatAgents2.ts`
   - Remove `isBuiltinParticipant` check for github.copilot

9. **Modify:** `src/vs/workbench/contrib/extensions/browser/extensionsActions.ts`
   - Remove extension unification message

10. **Search and Replace Globally:**
    - `github.copilot` → Remove or replace with iFlow references
    - `GitHub Copilot` → `Reasonance AI` or `iFlow AI`

### Phase 4: Update UI/Settings

11. **Modify:** `src/vs/workbench/contrib/chat/common/chatConfiguration.ts`
    - Remove GitHub Copilot settings
    - Add iFlow API key setting

12. **Modify:** `src/vs/workbench/contrib/welcomeAgentSessions/browser/agentSessionsWelcome.ts`
    - Remove "GitHub Copilot trial" messaging
    - Update to iFlow branding

13. **Modify:** Welcome/Getting Started content
    - Remove GitHub sign-up flows
    - Add iFlow API key setup instructions

### Phase 5: Extension Points

14. **Modify:** `package.json` (root)
    - Remove GitHub Copilot extension dependencies
    - Update product configuration

15. **Modify:** `product.json`
    - Remove GitHub Copilot related URLs
    - Add iFlow configuration

### Phase 6: Clean Up

16. **Remove:** MCP GitHub Copilot integration
    - `src/vs/workbench/contrib/mcp/browser/mcpCommandsAddConfiguration.ts`
    - Remove `AddConfigurationCopilotCommand` enum

17. **Remove:** Copilot-specific telemetry
    - `src/vs/workbench/contrib/editTelemetry/browser/telemetry/editSourceTrackingFeature.ts`
    - Remove copilot tracking

18. **Remove:** Terminal chat agent tools Copilot config
    - `src/vs/workbench/contrib/terminalContrib/chatAgentTools/common/terminalChatAgentToolsConfiguration.ts`

## Files Created

- ✅ `src/vs/workbench/contrib/chat/common/iflowLanguageModelProvider.ts`
- ✅ `IFLOW_INTEGRATION_PLAN.md`
- ✅ `IFLOW_REPLACEMENT_STEPS.md`

## Next Actions

1. Fix iFlow provider to implement ILanguageModelChatProvider interface
2. Register iFlow provider in LanguageModelsService
3. Remove GitHub Copilot provider registration
4. Test basic chat functionality
5. Continue with authentication removal

## Testing Checklist

- [ ] Chat panel opens
- [ ] Can send messages
- [ ] Responses stream correctly
- [ ] Tool calling works
- [ ] No GitHub authentication prompts
- [ ] API key can be configured
- [ ] Error handling works
