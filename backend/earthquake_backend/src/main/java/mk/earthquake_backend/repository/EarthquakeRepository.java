package mk.earthquake_backend.repository;

import mk.earthquake_backend.model.domain.Earthquake;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface EarthquakeRepository extends JpaRepository<Earthquake, Long> {
    List<Earthquake> findAllByMagnitudeGreaterThanAndTimeAfterOrderByTimeDesc(Double magnitude, Instant time);

    boolean existsByUsgsId(String usgsId);
}
