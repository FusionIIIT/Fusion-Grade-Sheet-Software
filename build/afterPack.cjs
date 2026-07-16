const { execSync } = require("child_process");
const path = require("path");

// Ad-hoc code-sign the macOS .app so Apple Silicon doesn't reject it as
// "damaged" (unsigned arm64 binaries are killed by Gatekeeper). This is not a
// Developer ID / notarized signature — users still get the milder
// "unidentified developer" prompt (right-click → Open / Open Anyway), which is
// far better than the dead-end "damaged" message. No paid certificate required.
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  execSync(`codesign --deep --force --sign - "${appPath}"`, { stdio: "inherit" });
};
