package mk.earthquake_backend;

import mk.earthquake_backend.model.enums.MagnitudeCategory;
import mk.earthquake_backend.model.dto.external.UsgsFeatureDto;
import mk.earthquake_backend.model.dto.external.UsgsGeometryDto;
import mk.earthquake_backend.model.dto.external.UsgsPropertiesDto;
import mk.earthquake_backend.model.dto.external.UsgsResponseDto;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.model.exceptions.UsgsApiException;
import mk.earthquake_backend.repository.EarthquakeRepository;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class EarthquakeServiceImplTest extends IntegrationTestBase {

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
    void fetchAndStoreEarthquakes_validResponse_storesAboveThreshold() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());

        List<EarthquakeResponseDto> result = earthquakeService.fetchAndStoreEarthquakes();

        // Threshold 0.5 keeps the 0.8/3.5/5.1 entries, drops 0.4.
        assertThat(result).hasSize(3);
        assertThat(earthquakeRepository.findAll()).hasSize(3);
        assertThat(result).allMatch(e -> e.magnitude() >= 0.5);
    }

    @Test
    void fetchAndStoreEarthquakes_secondCall_upsertsExistingRecords() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());

        earthquakeService.fetchAndStoreEarthquakes();
        earthquakeService.fetchAndStoreEarthquakes();

        assertThat(earthquakeRepository.findAll()).hasSize(3);
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
    void getStoredEarthquakes_defaultRange_returns24hWindow() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());
        earthquakeService.fetchAndStoreEarthquakes();

        Page<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(
                null, null, null, null, defaultPageable());

        // Test data is "now - 1h", inside the 24h default window.
        assertThat(result.getContent()).hasSize(3);
    }

    @Test
    void getStoredEarthquakes_minMagnitude_filtersBelowThreshold() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());
        earthquakeService.fetchAndStoreEarthquakes();

        Page<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(
                4.0, null, null, null, defaultPageable());

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).magnitude()).isEqualTo(5.1);
    }

    @Test
    void getStoredEarthquakes_singleCategory_filtersToRange() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());
        earthquakeService.fetchAndStoreEarthquakes();

        Page<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(
                null, EnumSet.of(MagnitudeCategory.MEDIUM), null, null, defaultPageable());

        // 5.1 is in [4, 7) → MEDIUM. 0.8, 3.5 are SMALL.
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).magnitude()).isEqualTo(5.1);
    }

    @Test
    void getStoredEarthquakes_disjointCategories_returnsUnion() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());
        earthquakeService.fetchAndStoreEarthquakes();

        Page<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(
                null,
                EnumSet.of(MagnitudeCategory.SMALL, MagnitudeCategory.LARGE),
                null, null,
                defaultPageable());

        // SMALL ∪ LARGE excludes the MEDIUM 5.1, leaves the SMALL entries (0.8, 3.5).
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent()).extracting(EarthquakeResponseDto::magnitude)
                .containsExactlyInAnyOrder(0.8, 3.5);
    }

    @Test
    void getStoredEarthquakes_pagination_returnsRequestedSlice() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());
        earthquakeService.fetchAndStoreEarthquakes();

        Page<EarthquakeResponseDto> page0 = earthquakeService.getStoredEarthquakes(
                null, null, null, null,
                PageRequest.of(0, 2, Sort.by(Sort.Direction.DESC, "time")));

        assertThat(page0.getContent()).hasSize(2);
        assertThat(page0.getTotalElements()).isEqualTo(3);
        assertThat(page0.getTotalPages()).isEqualTo(2);
    }

    @Test
    void fetchAndStoreEarthquakes_nullFeatures_returnsEmptyList() {
        // Stub: features == null — hits the early-return branch in fetchAndStoreEarthquakes
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(new UsgsResponseDto(null));

        List<EarthquakeResponseDto> result = earthquakeService.fetchAndStoreEarthquakes();

        assertThat(result).isEmpty();
        assertThat(earthquakeRepository.findAll()).isEmpty();
    }

    @Test
    void fetchAndStoreEarthquakes_emptyFeatures_returnsEmptyList() {
        // Stub: features = [] — hits the early-return branch (isEmpty check)
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(new UsgsResponseDto(List.of()));

        List<EarthquakeResponseDto> result = earthquakeService.fetchAndStoreEarthquakes();

        assertThat(result).isEmpty();
        assertThat(earthquakeRepository.findAll()).isEmpty();
    }

    @Test
    void fetchAndStoreEarthquakes_nullResponseBody_throwsUsgsApiException() {
        // Stub: getForObject returns null — hits the explicit null-check branch in fetchFromUsgs
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(null);

        assertThatThrownBy(() -> earthquakeService.fetchAndStoreEarthquakes())
                .isInstanceOf(UsgsApiException.class)
                .hasMessageContaining("null");
    }

    @Test
    void fetchAndStoreEarthquakes_upsertPreservesPrimaryKey() {
        // First ingest — inserts the record and captures the generated PK
        UsgsResponseDto firstResponse = new UsgsResponseDto(List.of(
                new UsgsFeatureDto(
                        "usgs-upsert-pk",
                        new UsgsPropertiesDto(3.5, "ml", "Place", "M 3.5", Instant.now().minusSeconds(3600).toEpochMilli()),
                        new UsgsGeometryDto(List.of(21.43, 42.00, 10.0))
                )
        ));
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(firstResponse);

        earthquakeService.fetchAndStoreEarthquakes();

        Long originalId = earthquakeRepository.findByUsgsId("usgs-upsert-pk")
                .orElseThrow().getId();

        // Second ingest — same usgsId, revised magnitude — must UPDATE not INSERT
        UsgsResponseDto revisedResponse = new UsgsResponseDto(List.of(
                new UsgsFeatureDto(
                        "usgs-upsert-pk",
                        new UsgsPropertiesDto(4.2, "ml", "Place", "M 4.2", Instant.now().minusSeconds(3600).toEpochMilli()),
                        new UsgsGeometryDto(List.of(21.43, 42.00, 10.0))
                )
        ));
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(revisedResponse);

        earthquakeService.fetchAndStoreEarthquakes();

        mk.earthquake_backend.model.domain.Earthquake updated =
                earthquakeRepository.findByUsgsId("usgs-upsert-pk").orElseThrow();

        // Same PK proves it was an UPDATE, not a DELETE+INSERT
        assertThat(updated.getId()).isEqualTo(originalId);
        assertThat(updated.getMagnitude()).isEqualTo(4.2);
        assertThat(earthquakeRepository.findAll()).hasSize(1);
    }

    @Test
    void getStoredEarthquakes_onlyFrom_filtersFromInclusive() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());
        earthquakeService.fetchAndStoreEarthquakes();

        // The test data uses Instant.now().minusSeconds(3600) as the event time.
        // Pass from = 2 hours ago (events at 1h ago are AFTER from) and to = null.
        Instant from = Instant.now().minusSeconds(7200);

        Page<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(
                null, null, from, null, defaultPageable());

        // All 3 stored events are at ~1h ago, which is after the 2h-ago from cutoff
        assertThat(result.getContent()).hasSize(3);
    }

    @Test
    void getStoredEarthquakes_onlyTo_filtersToInclusive() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());
        earthquakeService.fetchAndStoreEarthquakes();

        // Pass to = 30 minutes ago; events at 1h ago are BEFORE to, so they ARE included
        Instant to = Instant.now().minusSeconds(1800);

        Page<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(
                null, null, null, to, defaultPageable());

        assertThat(result.getContent()).hasSize(3);
    }

    @Test
    void getStoredEarthquakes_magnitudeZeroBoundary_includedInSmall() {
        // Insert a mag=0.0 event directly (below the 0.5 ingestion threshold — saved manually)
        mk.earthquake_backend.model.domain.Earthquake zeroMagEvent =
                mk.earthquake_backend.model.domain.Earthquake.builder()
                        .usgsId("usgs-zero-boundary")
                        .magnitude(0.0)
                        .magType("ml")
                        .place("Zero boundary place")
                        .title("M 0.0")
                        .time(Instant.now().minusSeconds(3600))
                        .latitude(42.0)
                        .longitude(21.0)
                        .depth(5.0)
                        .build();
        earthquakeRepository.save(zeroMagEvent);

        Page<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(
                null,
                EnumSet.of(MagnitudeCategory.SMALL),
                Instant.now().minusSeconds(7200),
                Instant.now(),
                defaultPageable());

        assertThat(result.getContent())
                .extracting(EarthquakeResponseDto::usgsId)
                .contains("usgs-zero-boundary");
    }

    @Test
    void getAllStoredEarthquakes_sameFilters_returnsList() {
        when(restTemplate.getForObject(any(String.class), eq(UsgsResponseDto.class)))
                .thenReturn(buildUsgsResponse());
        earthquakeService.fetchAndStoreEarthquakes();

        List<EarthquakeResponseDto> result = earthquakeService.getAllStoredEarthquakes(
                null, EnumSet.of(MagnitudeCategory.SMALL), null, null);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(EarthquakeResponseDto::magnitude)
                .containsExactlyInAnyOrder(0.8, 3.5);
    }

    // --- helpers ---

    private static PageRequest defaultPageable() {
        return PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "time"));
    }

    private UsgsResponseDto buildUsgsResponse() {
        long recentTime = Instant.now().minusSeconds(3600).toEpochMilli();

        UsgsFeatureDto small = new UsgsFeatureDto(
                "us7000aaa1",
                new UsgsPropertiesDto(3.5, "ml", "10km N of Skopje", "M 3.5 - Skopje", recentTime),
                new UsgsGeometryDto(List.of(21.43, 42.00, 10.0))
        );
        UsgsFeatureDto medium = new UsgsFeatureDto(
                "us7000aaa2",
                new UsgsPropertiesDto(5.1, "mw", "20km S of Ohrid", "M 5.1 - Ohrid", recentTime),
                new UsgsGeometryDto(List.of(20.80, 41.10, 15.0))
        );
        UsgsFeatureDto smallLow = new UsgsFeatureDto(
                "us7000aaa3",
                new UsgsPropertiesDto(0.8, "ml", "5km E of Veles", "M 0.8 - Veles", recentTime),
                new UsgsGeometryDto(List.of(21.77, 41.71, 5.0))
        );
        UsgsFeatureDto belowThreshold = new UsgsFeatureDto(
                "us7000aaa4",
                new UsgsPropertiesDto(0.4, "ml", "Microquake", "M 0.4", recentTime),
                new UsgsGeometryDto(List.of(21.0, 41.0, 2.0))
        );

        return new UsgsResponseDto(List.of(small, medium, smallLow, belowThreshold));
    }
}
