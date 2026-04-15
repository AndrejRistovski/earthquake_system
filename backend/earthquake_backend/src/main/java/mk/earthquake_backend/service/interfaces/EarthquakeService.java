package mk.earthquake_backend.service.interfaces;

import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;

import java.time.Instant;
import java.util.List;

public interface EarthquakeService {
    List<EarthquakeResponseDto> fetchAndStoreEarthquakes();

    List<EarthquakeResponseDto> getStoredEarthquakes(Double minMagnitude, Instant after);
}
