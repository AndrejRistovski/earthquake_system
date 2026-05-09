package mk.earthquake_backend.web.controller;

import jakarta.validation.constraints.DecimalMin;
import mk.earthquake_backend.model.enums.MagnitudeCategory;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.model.dto.response.PageResponse;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Validated
@RestController
@RequestMapping("/api/earthquakes")
public class EarthquakeController {

    private final EarthquakeService earthquakeService;

    public EarthquakeController(EarthquakeService earthquakeService) {
        this.earthquakeService = earthquakeService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<EarthquakeResponseDto>> getEarthquakes(
            @RequestParam(required = false)
            @DecimalMin(value = "0.0", message = "minMagnitude must be >= 0.0") Double minMagnitude,
            @RequestParam(required = false) Set<MagnitudeCategory> categories,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20, sort = "time", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PageResponse<EarthquakeResponseDto> result = PageResponse.from(
                earthquakeService.getStoredEarthquakes(minMagnitude, categories, from, to, pageable));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/all")
    public ResponseEntity<List<EarthquakeResponseDto>> getAllEarthquakes(
            @RequestParam(required = false)
            @DecimalMin(value = "0.0", message = "minMagnitude must be >= 0.0") Double minMagnitude,
            @RequestParam(required = false) Set<MagnitudeCategory> categories,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        List<EarthquakeResponseDto> result =
                earthquakeService.getAllStoredEarthquakes(minMagnitude, categories, from, to);
        return ResponseEntity.ok(result);
    }
}
