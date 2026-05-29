package mk.earthquake_backend;

import mk.earthquake_backend.model.domain.Earthquake;
import mk.earthquake_backend.model.dto.external.UsgsFeatureDto;
import mk.earthquake_backend.model.dto.external.UsgsGeometryDto;
import mk.earthquake_backend.model.dto.external.UsgsPropertiesDto;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.model.mapper.EarthquakeMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

public class EarthquakeMapperTest {
    private EarthquakeMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new EarthquakeMapper();
    }

    @Test
    void toEntity_validFeature_mapsAllFieldsCorrectly() {
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "10km N of Skopje", "M 3.5 - Skopje", 1712000000000L);
        UsgsGeometryDto geometry = new UsgsGeometryDto(List.of(21.43, 42.00, 10.5));
        UsgsFeatureDto feature = new UsgsFeatureDto("us7000abcd", props, geometry);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isPresent();
        Earthquake eq = result.get();
        assertThat(eq.getUsgsId()).isEqualTo("us7000abcd");
        assertThat(eq.getMagnitude()).isEqualTo(3.5);
        assertThat(eq.getMagType()).isEqualTo("ml");
        assertThat(eq.getPlace()).isEqualTo("10km N of Skopje");
        assertThat(eq.getTitle()).isEqualTo("M 3.5 - Skopje");
        assertThat(eq.getTime()).isEqualTo(Instant.ofEpochMilli(1712000000000L));
        assertThat(eq.getLongitude()).isEqualTo(21.43);
        assertThat(eq.getLatitude()).isEqualTo(42.00);
        assertThat(eq.getDepth()).isEqualTo(10.5);
    }

    @Test
    void toEntity_nullUsgsId_returnsEmpty() {
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", 1712000000000L);
        UsgsFeatureDto feature = new UsgsFeatureDto(null, props, null);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isEmpty();
    }

    @Test
    void toEntity_blankUsgsId_returnsEmpty() {
        // Covers the isBlank() whitespace branch — distinct from the null branch
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", 1712000000000L);
        UsgsFeatureDto feature = new UsgsFeatureDto("   ", props, null);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isEmpty();
    }

    @Test
    void toEntity_emptyUsgsId_returnsEmpty() {
        // Covers the isBlank() empty-string branch
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", 1712000000000L);
        UsgsFeatureDto feature = new UsgsFeatureDto("", props, null);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isEmpty();
    }

    @Test
    void toEntity_nullTime_returnsEmpty() {
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", null);
        UsgsFeatureDto feature = new UsgsFeatureDto("us7000abcd", props, null);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isEmpty();
    }

    @Test
    void toEntity_nullMagnitude_stillMapsRecord() {
        UsgsPropertiesDto props = new UsgsPropertiesDto(null, "ml", "Some place", "M - Unknown", 1712000000000L);
        UsgsFeatureDto feature = new UsgsFeatureDto("us7000abcd", props, null);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isPresent();
        assertThat(result.get().getMagnitude()).isNull();
    }

    @Test
    void toEntity_nullGeometry_mapsWithoutCoordinates() {
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", 1712000000000L);
        UsgsFeatureDto feature = new UsgsFeatureDto("us7000abcd", props, null);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isPresent();
        assertThat(result.get().getLatitude()).isNull();
        assertThat(result.get().getLongitude()).isNull();
        assertThat(result.get().getDepth()).isNull();
    }

    @Test
    void toEntity_incompleteCoordinates_mapsWithoutCoordinates() {
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", 1712000000000L);
        UsgsGeometryDto geometry = new UsgsGeometryDto(List.of(21.43));
        UsgsFeatureDto feature = new UsgsFeatureDto("us7000abcd", props, geometry);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isPresent();
        assertThat(result.get().getLatitude()).isNull();
        assertThat(result.get().getLongitude()).isNull();
        assertThat(result.get().getDepth()).isNull();
    }

    @Test
    void toEntity_zeroCoordinates_mapsWithoutCoordinates() {
        // coordinates: [] — size 0 is < 3, so lat/long/depth must all be null
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", 1712000000000L);
        UsgsGeometryDto geometry = new UsgsGeometryDto(List.of());
        UsgsFeatureDto feature = new UsgsFeatureDto("us7000abcd", props, geometry);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isPresent();
        assertThat(result.get().getLatitude()).isNull();
        assertThat(result.get().getLongitude()).isNull();
        assertThat(result.get().getDepth()).isNull();
    }

    @Test
    void toEntity_twoCoordinates_mapsWithoutCoordinates() {
        // coordinates: [21.0, 42.0] — size 2 is < 3, so lat/long/depth must all be null
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", 1712000000000L);
        UsgsGeometryDto geometry = new UsgsGeometryDto(List.of(21.0, 42.0));
        UsgsFeatureDto feature = new UsgsFeatureDto("us7000abcd", props, geometry);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isPresent();
        assertThat(result.get().getLatitude()).isNull();
        assertThat(result.get().getLongitude()).isNull();
        assertThat(result.get().getDepth()).isNull();
    }

    @Test
    void toEntity_extraCoordinates_usesFirstThree() {
        // coordinates: [21.0, 42.0, 10.0, 99.0] — size 4 is >= 3, first three should be used
        UsgsPropertiesDto props = new UsgsPropertiesDto(3.5, "ml", "Some place", "M 3.5", 1712000000000L);
        UsgsGeometryDto geometry = new UsgsGeometryDto(List.of(21.0, 42.0, 10.0, 99.0));
        UsgsFeatureDto feature = new UsgsFeatureDto("us7000abcd", props, geometry);

        Optional<Earthquake> result = mapper.toEntity(feature);

        assertThat(result).isPresent();
        Earthquake eq = result.get();
        // GeoJSON order: [longitude, latitude, depth]
        assertThat(eq.getLongitude()).isEqualTo(21.0);
        assertThat(eq.getLatitude()).isEqualTo(42.0);
        assertThat(eq.getDepth()).isEqualTo(10.0);
    }

    @Test
    void toEntity_nullFeature_returnsEmpty() {
        Optional<Earthquake> result = mapper.toEntity(null);

        assertThat(result).isEmpty();
    }

    // --- toResponseDto tests ---

    @Test
    void toResponseDto_validEntity_mapsAllFields() {
        // Given — a fully populated entity
        Instant fixedTime = Instant.parse("2026-01-15T10:30:00Z");
        Earthquake entity = Earthquake.builder()
                .id(99L)
                .usgsId("us7000test")
                .magnitude(5.7)
                .magType("mw")
                .place("50km E of Skopje")
                .title("M 5.7 - Skopje Region")
                .time(fixedTime)
                .latitude(42.05)
                .longitude(21.88)
                .depth(15.3)
                .build();

        // When
        EarthquakeResponseDto dto = mapper.toResponseDto(entity);

        // Then — every field of the DTO matches the source entity exactly
        assertThat(dto.id()).isEqualTo(99L);
        assertThat(dto.usgsId()).isEqualTo("us7000test");
        assertThat(dto.magnitude()).isEqualTo(5.7);
        assertThat(dto.magType()).isEqualTo("mw");
        assertThat(dto.place()).isEqualTo("50km E of Skopje");
        assertThat(dto.title()).isEqualTo("M 5.7 - Skopje Region");
        assertThat(dto.time()).isEqualTo(fixedTime);
        assertThat(dto.latitude()).isEqualTo(42.05);
        assertThat(dto.longitude()).isEqualTo(21.88);
        assertThat(dto.depth()).isEqualTo(15.3);
    }

    @Test
    void toResponseDto_nullOptionalFields_propagatesNulls() {
        // Given — entity with all nullable fields null
        Instant fixedTime = Instant.parse("2026-01-15T10:30:00Z");
        Earthquake entity = Earthquake.builder()
                .id(1L)
                .usgsId("us7000null")
                .magnitude(null)
                .magType(null)
                .place(null)
                .title(null)
                .time(fixedTime)
                .latitude(null)
                .longitude(null)
                .depth(null)
                .build();

        // When — no NPE should be thrown
        EarthquakeResponseDto dto = mapper.toResponseDto(entity);

        // Then — all nullable fields propagated as null
        assertThat(dto.magnitude()).isNull();
        assertThat(dto.magType()).isNull();
        assertThat(dto.place()).isNull();
        assertThat(dto.title()).isNull();
        assertThat(dto.latitude()).isNull();
        assertThat(dto.longitude()).isNull();
        assertThat(dto.depth()).isNull();
        // Required fields still present
        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.usgsId()).isEqualTo("us7000null");
        assertThat(dto.time()).isEqualTo(fixedTime);
    }
}
