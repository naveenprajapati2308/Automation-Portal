# Testrix Selenium/TestNG Starter Kit

This is a minimal, working Selenium/TestNG project pre-wired to report results to your Testrix
workspace. `config-v2.properties` already has your Test Engine's portal URL and API key filled in.

## Run it by hand (to test the connection)

    mvn clean test -DsuiteXmlFile=testng.xml -DexecutionId=<any-execution-code-from-testrix> \
        -DportalUrl={{PORTAL_URL}} -DportalApiKey={{API_KEY}} -Dusedefaultlisteners=true

Testrix's own Execution Center passes `-DexecutionId`, `-DportalUrl`, and `-DportalApiKey`
automatically for real runs dispatched through Execution Center — the command above is only for
testing this connection yourself, ahead of that.

## Files

- `config-v2.properties` — your workspace's portal URL, API key, framework path, and report path.
- `src/main/java/testrix/ConfigUtils.java` — reads `config-v2.properties`, but a `-D` system
  property of the same name always wins.
- `src/main/java/testrix/PortalApiClient.java` — pushes lifecycle events to Testrix. Fire-and-forget:
  a Testrix outage never fails your test run.
- `src/main/java/testrix/TestrixListener.java` — a TestNG listener that calls `PortalApiClient` at
  each lifecycle point. Add `@Listeners(TestrixListener.class)` to your own test classes to report
  their results too.
- `src/test/java/tests/SampleTest.java` — replace with your real tests.
- `testng.xml` — your suite definition. `usedefaultlisteners="true"` must stay on, or Surefire
  silently disables the listener wiring this kit depends on.

## Reserved property names

Testrix's Framework Runner already passes these — do not reuse them for your own config:
`suitexmlfile, executionid, portalurl, openreport, usedefaultlisteners, portalapikey`.

## Next step

Move this project's contents into wherever your workspace's actual Selenium checkout lives, or
build your real suite around `TestrixListener`/`PortalApiClient` directly. See the "Documentation"
page in Testrix (Connecting Your Framework Code) for how your platform admin registers this as a
runnable Module.
