package mk.earthquake_backend;

import mk.earthquake_backend.model.domain.Earthquake;
import mk.earthquake_backend.model.enums.MagnitudeCategory;
import mk.earthquake_backend.repository.EarthquakeRepository;
import mk.earthquake_backend.repository.EarthquakeSpecifications;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class EarthquakeRepositoryTest extends IntegrationTestBase {

    @MockitoBean
    private RestTemplate restTemplate;

    @Autowired
    private EarthquakeRepository earthquakeRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private final Instant BASE_TIME = Instant.parse("2026-01-01T12:00:00Z");

    @BeforeEach
    void setUp() {
        earthquakeRepository.deleteAll();

        earthquakeRepository.saveAll(List.of(
                buildEarthquake("usgs-small-1", 2.5, BASE_TIME.plusSeconds(500)),
                buildEarthquake("usgs-small-2", 3.9, BASE_TIME.plusSeconds(400)),
                buildEarthquake("usgs-medium-1", 4.0, BASE_TIME.plusSeconds(300)),
                buildEarthquake("usgs-medium-2", 6.5, BASE_TIME.plusSeconds(200)),
                buildEarthquake("usgs-large-1", 7.2, BASE_TIME.plusSeconds(100)),
                buildEarthquake("usgs-old", 5.0, BASE_TIME.minusSeconds(1000))
        ));
    }

    @Test
    void findByUsgsId_existing_returnsRecord() {
        Optional<Earthquake> result = earthquakeRepository.findByUsgsId("usgs-medium-2");

        assertThat(result).isPresent();
        assertThat(result.get().getMagnitude()).isEqualTo(6.5);
    }

    @Test
    void findByUsgsId_missing_returnsEmpty() {
        assertThat(earthquakeRepository.findByUsgsId("does-not-exist")).isEmpty();
    }

    @Test
    void deleteByTimeBefore_removesOlderRecords() {
        int deleted = transactionTemplate.execute(
                status -> earthquakeRepository.deleteByTimeBefore(BASE_TIME));

        assertThat(deleted).isEqualTo(1);
        assertThat(earthquakeRepository.findAll()).hasSize(5);
    }

    @Test
    void specs_timeBetween_excludesOutsideWindow() {
        Specification<Earthquake> spec =
                EarthquakeSpecifications.timeBetween(BASE_TIME, BASE_TIME.plusSeconds(1000));

        List<Earthquake> result = earthquakeRepository.findAll(spec, Sort.by("time"));

        assertThat(result).extracting(Earthquake::getUsgsId)
                .doesNotContain("usgs-old")
                .hasSize(5);
    }

    @Test
    void specs_magnitudeAtLeast_includesEqualThreshold() {
        Specification<Earthquake> spec = EarthquakeSpecifications.magnitudeAtLeast(4.0);

        List<Earthquake> result = earthquakeRepository.findAll(spec);

        // 4.0 itself must be included (>=, not >)
        assertThat(result).extracting(Earthquake::getUsgsId)
                .contains("usgs-medium-1")
                .doesNotContain("usgs-small-1", "usgs-small-2");
    }

    @Test
    void specs_inAnyCategory_singleCategory_returnsRangeOnly() {
        Specification<Earthquake> spec =
                EarthquakeSpecifications.inAnyCategory(EnumSet.of(MagnitudeCategory.MEDIUM));

        List<Earthquake> result = earthquakeRepository.findAll(spec);

        assertThat(result).extracting(Earthquake::getUsgsId)
                .containsExactlyInAnyOrder("usgs-medium-1", "usgs-medium-2", "usgs-old");
    }

    @Test
    void specs_inAnyCategory_disjointCategories_returnsUnion() {
        // Small + Large is the disjoint case — must not match anything in Medium.
        Specification<Earthquake> spec = EarthquakeSpecifications.inAnyCategory(
                EnumSet.of(MagnitudeCategory.SMALL, MagnitudeCategory.LARGE));

        List<Earthquake> result = earthquakeRepository.findAll(spec);

        assertThat(result).extracting(Earthquake::getUsgsId)
                .containsExactlyInAnyOrder("usgs-small-1", "usgs-small-2", "usgs-large-1");
    }

    @Test
    void specs_inAnyCategory_emptySet_isNoOp() {
        Specification<Earthquake> spec = EarthquakeSpecifications.inAnyCategory(Set.of());

        List<Earthquake> result = earthquakeRepository.findAll(spec);

        assertThat(result).hasSize(6);
    }

    @Test
    void specs_compose_filtersAreAndedTogether() {
        // Time-windowed AND in (Small ∪ Large) AND magnitude ≥ 3.0
        Specification<Earthquake> spec = EarthquakeSpecifications
                .timeBetween(BASE_TIME, BASE_TIME.plusSeconds(1000))
                .and(EarthquakeSpecifications.inAnyCategory(
                        EnumSet.of(MagnitudeCategory.SMALL, MagnitudeCategory.LARGE)))
                .and(EarthquakeSpecifications.magnitudeAtLeast(3.0));

        List<Earthquake> result = earthquakeRepository.findAll(spec);

        // usgs-small-1 (2.5) excluded by min-magnitude. usgs-old excluded by time.
        // medium entries excluded by category. → small-2 (3.9) + large-1 (7.2)
        assertThat(result).extracting(Earthquake::getUsgsId)
                .containsExactlyInAnyOrder("usgs-small-2", "usgs-large-1");
    }

    @Test
    void specs_pagination_appliesOffsetAndSort() {
        Specification<Earthquake> spec = EarthquakeSpecifications.magnitudeAtLeast(0.0);
        PageRequest pageable = PageRequest.of(0, 3, Sort.by(Sort.Direction.DESC, "time"));

        Page<Earthquake> page = earthquakeRepository.findAll(spec, pageable);

        assertThat(page.getTotalElements()).isEqualTo(6);
        assertThat(page.getContent()).hasSize(3);
        assertThat(page.getContent()).extracting(Earthquake::getUsgsId)
                .containsExactly("usgs-small-1", "usgs-small-2", "usgs-medium-1");
    }

    @Test
    void specs_inAnyCategory_smallIncludesZeroBoundary() {
        // Magnitude 0.0 is the lower edge of SMALL [0, 4) — must be included
        Earthquake zeroMag = buildEarthquake("usgs-zero-mag", 0.0, BASE_TIME.plusSeconds(600));
        earthquakeRepository.save(zeroMag);

        Specification<Earthquake> spec =
                EarthquakeSpecifications.inAnyCategory(EnumSet.of(MagnitudeCategory.SMALL));

        List<Earthquake> result = earthquakeRepository.findAll(spec);

        assertThat(result).extracting(Earthquake::getUsgsId)
                .contains("usgs-zero-mag");
    }

    @Test
    void specs_inAnyCategory_largeIncludesSevenExactly() {
        // Magnitude 7.0 exactly is in LARGE [7, ∞) and NOT in MEDIUM [4, 7)
        Earthquake sevenMag = buildEarthquake("usgs-seven-mag", 7.0, BASE_TIME.plusSeconds(700));
        earthquakeRepository.save(sevenMag);

        Specification<Earthquake> specLarge =
                EarthquakeSpecifications.inAnyCategory(EnumSet.of(MagnitudeCategory.LARGE));
        Specification<Earthquake> specMedium =
                EarthquakeSpecifications.inAnyCategory(EnumSet.of(MagnitudeCategory.MEDIUM));

        List<Earthquake> inLarge = earthquakeRepository.findAll(specLarge);
        List<Earthquake> inMedium = earthquakeRepository.findAll(specMedium);

        assertThat(inLarge).extracting(Earthquake::getUsgsId)
                .contains("usgs-seven-mag");
        assertThat(inMedium).extracting(Earthquake::getUsgsId)
                .doesNotContain("usgs-seven-mag");
    }

    private Earthquake buildEarthquake(String usgsId, double magnitude, Instant time) {
        return Earthquake.builder()
                .usgsId(usgsId)
                .magnitude(magnitude)
                .magType("ml")
                .place("Test place")
                .title("M " + magnitude)
                .time(time)
                .latitude(42.0)
                .longitude(21.0)
                .depth(10.0)
                .build();
    }
}
