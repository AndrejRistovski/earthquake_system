package mk.earthquake_backend;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Shared base for integration tests that need a real Postgres.
 *
 * Uses the singleton-container pattern: the container is started once in a
 * static initializer and never stopped, so it lives for the JVM run and is
 * reused across all subclasses. Testcontainers' Ryuk reaper cleans it up
 * when the JVM exits. This avoids the per-class container startup cost we'd
 * pay if every test class declared its own {@code @Container} field.
 */
@SpringBootTest
public abstract class IntegrationTestBase {

    @SuppressWarnings("resource")
    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void registerDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
