package mk.earthquake_backend.repository;

import jakarta.persistence.criteria.Predicate;
import mk.earthquake_backend.model.domain.Earthquake;
import mk.earthquake_backend.model.enums.MagnitudeCategory;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.Set;


public final class EarthquakeSpecifications {

    private EarthquakeSpecifications() {
    }

    public static Specification<Earthquake> timeBetween(Instant from, Instant to) {
        return (root, query, cb) -> {
            if (from == null && to == null) return cb.conjunction();
            if (from != null && to != null) return cb.between(root.get("time"), from, to);
            if (from != null) return cb.greaterThanOrEqualTo(root.get("time"), from);
            return cb.lessThanOrEqualTo(root.get("time"), to);
        };
    }

    public static Specification<Earthquake> magnitudeAtLeast(Double minMagnitude) {
        return (root, query, cb) -> {
            if (minMagnitude == null) return cb.conjunction();
            return cb.greaterThanOrEqualTo(root.get("magnitude"), minMagnitude);
        };
    }

    public static Specification<Earthquake> inAnyCategory(Set<MagnitudeCategory> categories) {
        return (root, query, cb) -> {
            if (categories == null || categories.isEmpty()) return cb.conjunction();
            Predicate[] predicates = categories.stream()
                    .map(c -> {
                        Predicate lower = cb.greaterThanOrEqualTo(root.get("magnitude"), c.lowerInclusive());
                        if (Double.isInfinite(c.upperExclusive())) {
                            return lower;
                        }
                        Predicate upper = cb.lessThan(root.get("magnitude"), c.upperExclusive());
                        return cb.and(lower, upper);
                    })
                    .toArray(Predicate[]::new);
            return cb.or(predicates);
        };
    }
}
