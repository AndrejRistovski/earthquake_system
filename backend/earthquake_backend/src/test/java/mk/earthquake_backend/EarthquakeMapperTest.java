package mk.earthquake_backend;

import mk.earthquake_backend.model.domain.Earthquake;
import mk.earthquake_backend.model.dto.external.UsgsFeatureDto;
import mk.earthquake_backend.model.dto.external.UsgsGeometryDto;
import mk.earthquake_backend.model.dto.external.UsgsPropertiesDto;
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
    void toEntity_nullFeature_returnsEmpty() {
        Optional<Earthquake> result = mapper.toEntity(null);

        assertThat(result).isEmpty();
    }
}
