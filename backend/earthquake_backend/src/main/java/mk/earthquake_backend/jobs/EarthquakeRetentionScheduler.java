package mk.earthquake_backend.jobs;

import jakarta.transaction.Transactional;
import mk.earthquake_backend.repository.EarthquakeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class EarthquakeRetentionScheduler {

    private static final Logger log = LoggerFactory.getLogger(EarthquakeRetentionScheduler.class);

    private final EarthquakeRepository earthquakeRepository;

    @Value("${app.retention.days}")
    private long retentionDays;

    public EarthquakeRetentionScheduler(EarthquakeRepository earthquakeRepository) {
        this.earthquakeRepository = earthquakeRepository;
    }

    @Scheduled(cron = "${app.retention.cron}")
    @Transactional
    public void prune() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        int deleted = earthquakeRepository.deleteByTimeBefore(cutoff);
        log.info("Retention prune removed {} earthquakes older than {} ({} days)", deleted, cutoff, retentionDays);
    }
}
