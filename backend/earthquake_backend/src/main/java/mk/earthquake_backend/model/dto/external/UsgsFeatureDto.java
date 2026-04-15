package mk.earthquake_backend.model.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UsgsFeatureDto(
        String id,
        UsgsPropertiesDto properties,
        UsgsGeometryDto geometry
) {
}
