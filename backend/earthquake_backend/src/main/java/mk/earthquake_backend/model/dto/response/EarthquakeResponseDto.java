package mk.earthquake_backend.model.dto.response;

import java.time.Instant;

public record EarthquakeResponseDto(
        Long id,
        String usgsId,
        Double magnitude,
        String magType,
        String place,
        String title,
        Instant time,
        Double latitude,
        Double longitude,
        Double depth
) {
}
