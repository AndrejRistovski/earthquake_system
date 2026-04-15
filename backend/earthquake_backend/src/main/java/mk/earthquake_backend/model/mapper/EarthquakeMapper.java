package mk.earthquake_backend.model.mapper;

import mk.earthquake_backend.model.domain.Earthquake;
import mk.earthquake_backend.model.dto.external.UsgsFeatureDto;
import mk.earthquake_backend.model.dto.external.UsgsGeometryDto;
import mk.earthquake_backend.model.dto.external.UsgsPropertiesDto;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Component
public class EarthquakeMapper {
    private static final Logger log = LoggerFactory.getLogger(EarthquakeMapper.class);

    public Optional<Earthquake> toEntity(UsgsFeatureDto feature) {
        if (feature == null) {
            log.warn("Skipping null feature");
            return Optional.empty();
        }

        String usgsId = feature.id();
        if (usgsId == null || usgsId.isBlank()) {
            log.warn("Skipping feature with missing usgsId");
            return Optional.empty();
        }

        UsgsPropertiesDto props = feature.properties();
        if (props == null || props.time() == null) {
            log.warn("Skipping feature [{}] — null properties or time", usgsId);
            return Optional.empty();
        }

        Instant time = Instant.ofEpochMilli(props.time());

        Double latitude = null;
        Double longitude = null;
        Double depth = null;

        UsgsGeometryDto geometry = feature.geometry();
        if (geometry != null) {
            List<Double> coords = geometry.coordinates();
            if (coords != null && coords.size() >= 3) {
                longitude = coords.get(0);
                latitude = coords.get(1);
                depth = coords.get(2);
            } else {
                log.warn("Feature [{}] has incomplete coordinates — storing without location", usgsId);
            }
        }

        Earthquake earthquake = Earthquake.builder()
                .usgsId(usgsId)
                .magnitude(props.mag())
                .magType(props.magType())
                .place(props.place())
                .title(props.title())
                .time(time)
                .latitude(latitude)
                .longitude(longitude)
                .depth(depth)
                .build();

        return Optional.of(earthquake);
    }

    public EarthquakeResponseDto toResponseDto(Earthquake earthquake) {
        return new EarthquakeResponseDto(
                earthquake.getId(),
                earthquake.getUsgsId(),
                earthquake.getMagnitude(),
                earthquake.getMagType(),
                earthquake.getPlace(),
                earthquake.getTitle(),
                earthquake.getTime(),
                earthquake.getLatitude(),
                earthquake.getLongitude(),
                earthquake.getDepth()
        );
    }
}
