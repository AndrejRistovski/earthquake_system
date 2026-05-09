package mk.earthquake_backend.service.interfaces;

import mk.earthquake_backend.model.enums.MagnitudeCategory;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public interface EarthquakeService {

    List<EarthquakeResponseDto> fetchAndStoreEarthquakes();

    Page<EarthquakeResponseDto> getStoredEarthquakes(
            Double minMagnitude,
            Set<MagnitudeCategory> categories,
            Instant from,
            Instant to,
            Pageable pageable
    );

    List<EarthquakeResponseDto> getAllStoredEarthquakes(
            Double minMagnitude,
            Set<MagnitudeCategory> categories,
            Instant from,
            Instant to
    );
}
