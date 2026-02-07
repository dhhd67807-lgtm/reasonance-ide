# Fix "Reasonance is damaged" Error on macOS

When you download Reasonance and try to open it, macOS may show:
> "Reasonance" is damaged and can't be opened. You should move it to the Bin.

This happens because the app isn't code-signed by Apple. Here's how to fix it:

## Quick Fix (One Command)

Open Terminal and run:

```bash
sudo xattr -cr /Applications/Reasonance.app && sudo codesign --force --deep --sign - /Applications/Reasonance.app
```

**Note:** Replace `/Applications/Reasonance.app` with the actual path if you installed it elsewhere.

## Or Use the Fix Script

1. Download `fix-macos-app.sh`
2. Open Terminal in the same folder
3. Run:
   ```bash
   chmod +x fix-macos-app.sh
   ./fix-macos-app.sh
   ```

## What This Does

1. **Removes quarantine attribute** - macOS adds this to downloaded files
2. **Ad-hoc signs the app** - Creates a local signature so macOS trusts it
3. **Clears extended attributes** - Removes security flags

## Opening Reasonance

After running the fix:

1. Right-click on Reasonance.app
2. Select "Open"
3. Click "Open" in the security dialog

Or from Terminal:
```bash
open /Applications/Reasonance.app
```

## Why This Happens

- Reasonance is built from source without Apple Developer signing
- macOS Gatekeeper blocks unsigned apps by default
- This is normal for open-source builds
- The fix is safe and only affects this specific app

## Alternative: Disable Gatekeeper (Not Recommended)

If you want to allow all unsigned apps (less secure):

```bash
sudo spctl --master-disable
```

To re-enable:
```bash
sudo spctl --master-enable
```
