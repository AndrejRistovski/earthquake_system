package mk.earthquake_backend.jobs;

import mk.earthquake_backend.model.exceptions.UsgsApiException;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class EarthquakeIngestionScheduler {

    private static final Logger log = LoggerFactory.getLogger(EarthquakeIngestionScheduler.class);

    private final EarthquakeService earthquakeService;

    public EarthquakeIngestionScheduler(EarthquakeService earthquakeService) {
        this.earthquakeService = earthquakeService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void refresh() {
        try {
            int processed = earthquakeService.fetchAndStoreEarthquakes().size();
            log.info("Startup ingestion completed: {} events processed", processed);
        } catch (UsgsApiException ex) {
            log.warn("Startup ingestion failed: {}", ex.getMessage());
        }
    }

    @Scheduled(cron = "${app.usgs.refresh-cron}")
    public void refreshScheduled() {
        try {
            int processed = earthquakeService.fetchAndStoreEarthquakes().size();
            log.info("Scheduled ingestion completed: {} events processed", processed);
        } catch (UsgsApiException ex) {
            log.warn("Scheduled ingestion failed: {}", ex.getMessage());
        }
    }
}
