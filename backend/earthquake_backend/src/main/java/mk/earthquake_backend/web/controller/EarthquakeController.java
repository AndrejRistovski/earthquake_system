package mk.earthquake_backend.web.controller;

import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/earthquakes")
public class EarthquakeController {
    private final EarthquakeService earthquakeService;

    public EarthquakeController(EarthquakeService earthquakeService) {
        this.earthquakeService = earthquakeService;
    }

    @GetMapping
    public ResponseEntity<List<EarthquakeResponseDto>> getEarthquakes(
            @RequestParam(required = false) Double minMagnitude,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant after
    ) {
        List<EarthquakeResponseDto> result = earthquakeService.getStoredEarthquakes(minMagnitude, after);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/refresh")
    public ResponseEntity<List<EarthquakeResponseDto>> refresh() {
        List<EarthquakeResponseDto> result = earthquakeService.fetchAndStoreEarthquakes();
        return ResponseEntity.ok(result);
    }
}
