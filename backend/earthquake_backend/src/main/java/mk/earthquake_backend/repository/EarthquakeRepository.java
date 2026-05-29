package mk.earthquake_backend.repository;

import mk.earthquake_backend.model.domain.Earthquake;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EarthquakeRepository
        extends JpaRepository<Earthquake, Long>, JpaSpecificationExecutor<Earthquake> {

    Optional<Earthquake> findByUsgsId(String usgsId);

    List<Earthquake> findAllByUsgsIdIn(Collection<String> usgsIds);

    @Modifying
    @Query("delete from Earthquake e where e.time < :cutoff")
    int deleteByTimeBefore(@Param("cutoff") Instant cutoff);
}
