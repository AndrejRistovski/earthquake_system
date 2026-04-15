package mk.earthquake_backend.model.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UsgsPropertiesDto(
        Double mag,
        String magType,
        String place,
        String title,
        Long time
) {
}
