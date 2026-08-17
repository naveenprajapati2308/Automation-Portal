#!/bin/sh
# Chrome is launched by MPHIDB's own test code in normal (non-headless) mode — that's
# intentional so it keeps working unchanged when run natively on a Windows desktop with a
# real display. Inside this container there's no real display, so give it a virtual one
# instead of touching the framework's test code.
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
sleep 1

# Xvfb alone has no window manager, so driver.manage().window().maximize() (AuthorityLogin.java
# etc. call this on every suite) fails with "Runtime.evaluate wasn't found" — there's nothing to
# actually respond to the maximize/resize request. fluxbox is a minimal WM just for that.
fluxbox &
sleep 1

# The Playwright project directory is bind-mounted from the Windows host, but its
# node_modules (if the host has one) is Windows-native and won't run in this Linux
# container — node_modules itself is a separate Docker volume (see docker-compose.yml) so
# it starts empty here. Install into it once; later boots reuse it unless it's missing.
if [ -d "$PLAYWRIGHT_FRAMEWORK_PATH" ] && [ ! -x "$PLAYWRIGHT_FRAMEWORK_PATH/node_modules/.bin/playwright" ]; then
    echo "Installing Playwright framework npm dependencies (first run)..."
    (cd "$PLAYWRIGHT_FRAMEWORK_PATH" && npm ci)
fi

# Each project-specific framework under PROJECT_FRAMEWORKS_ROOT (one subfolder per registered
# Test Engine's framework_path — see FrameworkRunnerService's projectFrameworksRoot) is a brand
# new starter-kit checkout with no pre-existing Windows-native node_modules to worry about, so —
# unlike PLAYWRIGHT_FRAMEWORK_PATH above — it installs directly into the bind-mounted directory,
# no separate shadow volume needed. Runs once per subfolder, on first boot only.
if [ -d "$PROJECT_FRAMEWORKS_ROOT" ]; then
    for pkg in "$PROJECT_FRAMEWORKS_ROOT"/*/package.json; do
        [ -f "$pkg" ] || continue
        dir=$(dirname "$pkg")
        if [ ! -d "$dir/node_modules" ]; then
            echo "Installing npm dependencies for project framework: $dir"
            (cd "$dir" && npm install)
        fi
    done
fi

exec java -cp /app/framework-runner.jar runner.FrameworkRunnerService
