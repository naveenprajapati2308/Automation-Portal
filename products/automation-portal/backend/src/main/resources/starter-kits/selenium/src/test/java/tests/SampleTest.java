package tests;

import org.testng.annotations.Listeners;
import org.testng.annotations.Test;
import testrix.TestrixListener;

/** Replace this with your real tests — this one only proves the Testrix connection works. */
@Listeners(TestrixListener.class)
public class SampleTest {

    @Test
    public void sampleTestConnectsToTestrix() {
        System.out.println("Hello from the Testrix Selenium starter kit.");
    }
}
