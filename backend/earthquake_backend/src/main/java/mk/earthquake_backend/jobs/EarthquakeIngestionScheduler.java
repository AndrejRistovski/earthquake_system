package mk.earthquake_backend.jobs;

import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Performs the one-shot USGS ingestion at application startup.
 * <p>
 * The USGS feed configured in {@code app.usgs.url} returns the last 30 days of events,
 * so a single fetch on {@link ApplicationReadyEvent} is enough to populate the database;
 * all subsequent filtering ({@code 24h}, {@code 7d}, {@code 30d}, magnitude categories)
 * is served from the persisted data without further external calls.
 */
@Component
public class EarthquakeIngestionScheduler {

    private static final Logger log = LoggerFactory.getLogger(EarthquakeIngestionScheduler.class);

    private final EarthquakeService earthquakeService;

    public EarthquakeIngestionScheduler(EarthquakeService earthquakeService) {
        this.earthquakeService = earthquakeService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void refresh() {
        int processed = earthquakeService.fetchAndStoreEarthquakes().size();
        log.info("Startup ingestion completed: {} events processed", processed);
    }
}
