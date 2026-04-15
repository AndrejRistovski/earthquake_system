package mk.earthquake_backend.service.implementations;

import jakarta.transaction.Transactional;
import mk.earthquake_backend.model.domain.Earthquake;
import mk.earthquake_backend.model.dto.external.UsgsResponseDto;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.model.exceptions.UsgsApiException;
import mk.earthquake_backend.model.mapper.EarthquakeMapper;
import mk.earthquake_backend.repository.EarthquakeRepository;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
public class EarthquakeServiceImplementation implements EarthquakeService {

    private static final Logger log = LoggerFactory.getLogger(EarthquakeServiceImplementation.class);

    private static final double MIN_MAGNITUDE = 0.0;

    private final RestTemplate restTemplate;
    private final EarthquakeRepository earthquakeRepository;
    private final EarthquakeMapper earthquakeMapper;

    @Value("${app.usgs.url}")
    private String usgsUrl;

    @Value("${app.usgs.default-hours-back}")
    private int defaultHoursBack;

    public EarthquakeServiceImplementation(RestTemplate restTemplate, EarthquakeRepository earthquakeRepository, EarthquakeMapper earthquakeMapper) {
        this.restTemplate = restTemplate;
        this.earthquakeRepository = earthquakeRepository;
        this.earthquakeMapper = earthquakeMapper;
    }

    @Override
    @Transactional
    public List<EarthquakeResponseDto> fetchAndStoreEarthquakes() {
        UsgsResponseDto response = fetchFromUsgs();

        if (response.features() == null || response.features().isEmpty()) {
            log.warn("USGS response contained no features");
            return List.of();
        }

        Instant since = Instant.now().minus(defaultHoursBack, ChronoUnit.HOURS);

        List<Earthquake> filtered = response.features().stream()
                .map(earthquakeMapper::toEntity)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(e -> e.getMagnitude() != null && e.getMagnitude() > MIN_MAGNITUDE)
                .filter(e -> e.getTime().isAfter(since))
                .toList();

        earthquakeRepository.deleteAllInBatch();
        List<Earthquake> saved = earthquakeRepository.saveAll(filtered);

        log.info("Stored {} earthquakes after filtering", saved.size());

        return saved.stream()
                .map(earthquakeMapper::toResponseDto)
                .toList();
    }

    @Override
    public List<EarthquakeResponseDto> getStoredEarthquakes(Double minMagnitude, Instant after) {
        Double magnitudeThreshold = minMagnitude != null ? minMagnitude : MIN_MAGNITUDE;
        Instant timeThreshold = after != null ? after : Instant.now().minus(defaultHoursBack, ChronoUnit.HOURS);

        return earthquakeRepository
                .findAllByMagnitudeGreaterThanAndTimeAfterOrderByTimeDesc(magnitudeThreshold, timeThreshold)
                .stream()
                .map(earthquakeMapper::toResponseDto)
                .toList();
    }

    private UsgsResponseDto fetchFromUsgs() {
        try {
            UsgsResponseDto response = restTemplate.getForObject(usgsUrl, UsgsResponseDto.class);
            if (response == null) {
                throw new UsgsApiException("USGS API returned a null response");
            }
            return response;
        } catch (RestClientException ex) {
            throw new UsgsApiException("Failed to fetch data from USGS API: " + ex.getMessage(), ex);
        }
    }
}
