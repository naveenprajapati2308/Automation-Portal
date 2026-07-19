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

exec java -cp /app/framework-runner.jar runner.FrameworkRunnerService
