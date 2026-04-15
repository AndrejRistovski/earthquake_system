package mk.earthquake_backend;

import mk.earthquake_backend.model.dto.external.UsgsFeatureDto;
import mk.earthquake_backend.model.dto.external.UsgsGeometryDto;
import mk.earthquake_backend.model.dto.external.UsgsPropertiesDto;
import mk.earthquake_backend.model.dto.external.UsgsResponseDto;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.repository.EarthquakeRepository;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import mk.earthquake_backend.model.exceptions.UsgsApiException;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@SpringBootTest
@Testcontainers
class EarthquakeServiceImplTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16");

    @Autowired
    private EarthquakeService earthquakeService;

    @Autowired
    private EarthquakeRepository earthquakeRepository;

    @MockitoBean
    private RestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        earthquakeRepository.deleteAll();
    }

    @Test
    void fetchAndStoreEarthquakes_validResponse_storesFilteredEarthquakes() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());

        List<EarthquakeResponseDto> result = earthquakeService.fetchAndStoreEarthquakes();

        assertThat(result).hasSize(2);
        assertThat(earthquakeRepository.findAll()).hasSize(2);
        assertThat(result).allMatch(e -> e.magnitude() > 2.0);
    }

    @Test
    void fetchAndStoreEarthquakes_secondCall_replacesExistingRecords() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());

        earthquakeService.fetchAndStoreEarthquakes();
        earthquakeService.fetchAndStoreEarthquakes();

        assertThat(earthquakeRepository.findAll()).hasSize(2);
    }

    @Test
    void fetchAndStoreEarthquakes_usgsApiDown_throwsUsgsApiException() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenThrow(new RestClientException("Connection refused"));

        assertThatThrownBy(() -> earthquakeService.fetchAndStoreEarthquakes())
                .isInstanceOf(UsgsApiException.class)
                .hasMessageContaining("Failed to fetch data from USGS API");
    }

    @Test
    void fetchAndStoreEarthquakes_belowMagnitudeThreshold_notStored() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponseWithLowMagnitude());

        List<EarthquakeResponseDto> result = earthquakeService.fetchAndStoreEarthquakes();

        assertThat(result).isEmpty();
        assertThat(earthquakeRepository.findAll()).isEmpty();
    }

    @Test
    void getStoredEarthquakes_withMinMagnitude_returnsFilteredResults() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());

        earthquakeService.fetchAndStoreEarthquakes();

        List<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(4.0, null);

        assertThat(result).allMatch(e -> e.magnitude() > 4.0);
    }

    // --- helpers ---

    private UsgsResponseDto buildUsgsResponse() {
        long recentTime = Instant.now().minusSeconds(3600).toEpochMilli();

        UsgsFeatureDto feature1 = new UsgsFeatureDto(
                "us7000aaa1",
                new UsgsPropertiesDto(3.5, "ml", "10km N of Skopje", "M 3.5 - Skopje", recentTime),
                new UsgsGeometryDto(List.of(21.43, 42.00, 10.0))
        );
        UsgsFeatureDto feature2 = new UsgsFeatureDto(
                "us7000aaa2",
                new UsgsPropertiesDto(5.1, "mw", "20km S of Ohrid", "M 5.1 - Ohrid", recentTime),
                new UsgsGeometryDto(List.of(20.80, 41.10, 15.0))
        );
        // this one should be filtered out — magnitude below 2.0
        UsgsFeatureDto feature3 = new UsgsFeatureDto(
                "us7000aaa3",
                new UsgsPropertiesDto(1.2, "ml", "5km E of Veles", "M 1.2 - Veles", recentTime),
                new UsgsGeometryDto(List.of(21.77, 41.71, 5.0))
        );

        return new UsgsResponseDto(List.of(feature1, feature2, feature3));
    }

    private UsgsResponseDto buildUsgsResponseWithLowMagnitude() {
        long recentTime = Instant.now().minusSeconds(3600).toEpochMilli();

        UsgsFeatureDto feature = new UsgsFeatureDto(
                "us7000aaa4",
                new UsgsPropertiesDto(0.8, "ml", "Some place", "M 0.8", recentTime),
                new UsgsGeometryDto(List.of(21.43, 42.00, 5.0))
        );

        return new UsgsResponseDto(List.of(feature));
    }
}
