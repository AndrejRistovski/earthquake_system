package mk.earthquake_backend.service.implementations;

import org.springframework.transaction.annotation.Transactional;
import mk.earthquake_backend.model.domain.Earthquake;
import mk.earthquake_backend.model.enums.MagnitudeCategory;
import mk.earthquake_backend.model.dto.external.UsgsResponseDto;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.model.exceptions.UsgsApiException;
import mk.earthquake_backend.model.mapper.EarthquakeMapper;
import mk.earthquake_backend.repository.EarthquakeRepository;
import mk.earthquake_backend.repository.EarthquakeSpecifications;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EarthquakeServiceImplementation implements EarthquakeService {

    private static final Logger log = LoggerFactory.getLogger(EarthquakeServiceImplementation.class);

    private static final long DEFAULT_QUERY_HOURS_BACK = 24L;
    private static final Sort DEFAULT_ALL_SORT = Sort.by(Sort.Direction.DESC, "time");
    private static final int MAX_ALL_RESULTS = 10_000;

    private final RestTemplate restTemplate;
    private final EarthquakeRepository earthquakeRepository;
    private final EarthquakeMapper earthquakeMapper;

    @Value("${app.usgs.url}")
    private String usgsUrl;

    @Value("${app.usgs.min-magnitude}")
    private double minMagnitude;

    public EarthquakeServiceImplementation(RestTemplate restTemplate,
                                           EarthquakeRepository earthquakeRepository,
                                           EarthquakeMapper earthquakeMapper) {
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

        List<Earthquake> incoming = response.features().stream()
                .map(earthquakeMapper::toEntity)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(e -> e.getMagnitude() != null && e.getMagnitude() >= minMagnitude)
                .toList();

        Set<String> incomingIds = incoming.stream()
                .map(Earthquake::getUsgsId)
                .collect(Collectors.toSet());

        Map<String, Earthquake> existingByUsgsId = earthquakeRepository.findAllByUsgsIdIn(incomingIds)
                .stream()
                .collect(Collectors.toMap(Earthquake::getUsgsId, e -> e));

        List<Earthquake> toSave = new ArrayList<>(incoming.size());
        int inserted = 0;
        int updated = 0;
        for (Earthquake fresh : incoming) {
            Earthquake existing = existingByUsgsId.get(fresh.getUsgsId());
            if (existing != null) {
                Earthquake merged = Earthquake.builder()
                        .id(existing.getId())
                        .usgsId(fresh.getUsgsId())
                        .magnitude(fresh.getMagnitude())
                        .magType(fresh.getMagType())
                        .place(fresh.getPlace())
                        .title(fresh.getTitle())
                        .time(fresh.getTime())
                        .latitude(fresh.getLatitude())
                        .longitude(fresh.getLongitude())
                        .depth(fresh.getDepth())
                        .build();
                toSave.add(merged);
                updated++;
            } else {
                toSave.add(fresh);
                inserted++;
            }
        }

        List<Earthquake> persisted = new ArrayList<>();
        earthquakeRepository.saveAll(toSave).forEach(persisted::add);

        log.info("Ingestion complete: {} inserted, {} updated, {} considered", inserted, updated, incoming.size());

        return persisted.stream()
                .map(earthquakeMapper::toResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EarthquakeResponseDto> getStoredEarthquakes(Double minMagnitudeArg,
                                                            Set<MagnitudeCategory> categories,
                                                            Instant from,
                                                            Instant to,
                                                            Pageable pageable) {
        Specification<Earthquake> spec = buildFilterSpec(minMagnitudeArg, categories, from, to);
        return earthquakeRepository.findAll(spec, pageable).map(earthquakeMapper::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EarthquakeResponseDto> getAllStoredEarthquakes(Double minMagnitudeArg,
                                                               Set<MagnitudeCategory> categories,
                                                               Instant from,
                                                               Instant to) {
        Specification<Earthquake> spec = buildFilterSpec(minMagnitudeArg, categories, from, to);
        return earthquakeRepository.findAll(spec, PageRequest.of(0, MAX_ALL_RESULTS, DEFAULT_ALL_SORT))
                .getContent().stream()
                .map(earthquakeMapper::toResponseDto)
                .toList();
    }

    private Specification<Earthquake> buildFilterSpec(Double minMagnitudeArg,
                                                      Set<MagnitudeCategory> categories,
                                                      Instant from,
                                                      Instant to) {
        Instant effectiveTo = to;
        Instant effectiveFrom = from;
        if (effectiveFrom == null && effectiveTo == null) {
            effectiveTo = Instant.now();
            effectiveFrom = effectiveTo.minus(DEFAULT_QUERY_HOURS_BACK, ChronoUnit.HOURS);
        }

        return EarthquakeSpecifications.timeBetween(effectiveFrom, effectiveTo)
                .and(EarthquakeSpecifications.magnitudeAtLeast(minMagnitudeArg))
                .and(EarthquakeSpecifications.inAnyCategory(categories));
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
