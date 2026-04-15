package mk.earthquake_backend.model.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UsgsGeometryDto(
        List<Double> coordinates
) {
}
