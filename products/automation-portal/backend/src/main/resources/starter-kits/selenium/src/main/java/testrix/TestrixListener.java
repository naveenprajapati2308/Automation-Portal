package testrix;

import org.testng.ISuite;
import org.testng.ISuiteListener;
import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;

import java.util.Map;

/**
 * Wires TestNG's own lifecycle callbacks to PortalApiClient. Add @Listeners(TestrixListener.class)
 * to any suite/class you want reported to Testrix (or list it in testng.xml's &lt;listeners&gt;).
 */
public class TestrixListener implements ISuiteListener, ITestListener {

    @Override
    public void onStart(ISuite suite) {
        PortalApiClient.sendEvent("SUITE_STARTED", Map.of("suiteName", suite.getName()));
    }

    @Override
    public void onFinish(ISuite suite) {
        PortalApiClient.sendEvent("SUITE_COMPLETED", Map.of("suiteName", suite.getName()));
    }

    @Override
    public void onStart(ITestContext context) {
        PortalApiClient.sendEvent("MODULE_STARTED", Map.of("moduleName", context.getName()));
    }

    @Override
    public void onFinish(ITestContext context) {
        PortalApiClient.sendEvent("MODULE_COMPLETED", Map.of("moduleName", context.getName()));
    }

    @Override
    public void onTestStart(ITestResult result) {
        PortalApiClient.sendEvent("TEST_STARTED", Map.of("testName", result.getName()));
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        PortalApiClient.sendEvent("TEST_PASSED", Map.of("testName", result.getName()));
    }

    @Override
    public void onTestFailure(ITestResult result) {
        String reason = result.getThrowable() != null ? String.valueOf(result.getThrowable().getMessage()) : "";
        PortalApiClient.sendEvent("TEST_FAILED", Map.of("testName", result.getName(), "reason", reason));
    }

    @Override
    public void onTestSkipped(ITestResult result) {
        PortalApiClient.sendEvent("TEST_SKIPPED", Map.of("testName", result.getName()));
    }
}
