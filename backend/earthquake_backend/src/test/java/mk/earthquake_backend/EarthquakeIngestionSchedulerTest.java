package mk.earthquake_backend;

import mk.earthquake_backend.jobs.EarthquakeIngestionScheduler;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EarthquakeIngestionSchedulerTest {

    @Mock
    private EarthquakeService earthquakeService;

    private EarthquakeIngestionScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new EarthquakeIngestionScheduler(earthquakeService);
    }

    @Test
    void refresh_callsFetchAndStore() {
        when(earthquakeService.fetchAndStoreEarthquakes()).thenReturn(List.of(buildDto("us-1")));

        scheduler.refresh();

        verify(earthquakeService).fetchAndStoreEarthquakes();
    }

    @Test
    void refresh_emptyResult_doesNotThrow() {
        when(earthquakeService.fetchAndStoreEarthquakes()).thenReturn(List.of());

        scheduler.refresh();

        verify(earthquakeService).fetchAndStoreEarthquakes();
    }

    private EarthquakeResponseDto buildDto(String usgsId) {
        return new EarthquakeResponseDto(1L, usgsId, 3.5, "ml", "place", "title",
                Instant.now(), 42.0, 21.0, 10.0);
    }
}
