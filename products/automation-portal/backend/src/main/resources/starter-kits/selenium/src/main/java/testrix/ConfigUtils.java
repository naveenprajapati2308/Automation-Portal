package testrix;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/** Reads connection config: a -D system property wins, otherwise falls back to config-v2.properties. */
public final class ConfigUtils {
    private static final Properties FILE_PROPS = load();

    private ConfigUtils() {}

    public static String get(String key) {
        String systemProperty = System.getProperty(key);
        if (systemProperty != null && !systemProperty.isBlank()) return systemProperty;
        return FILE_PROPS.getProperty(key);
    }

    private static Properties load() {
        Properties props = new Properties();
        try (InputStream in = ConfigUtils.class.getClassLoader().getResourceAsStream("config-v2.properties")) {
            if (in != null) props.load(in);
        } catch (IOException e) {
            System.err.println("[Testrix] Could not read config-v2.properties: " + e.getMessage());
        }
        return props;
    }
}
