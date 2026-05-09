package mk.earthquake_backend.model.enums;

public enum MagnitudeCategory {
    SMALL(0.0, 4.0),
    MEDIUM(4.0, 7.0),
    LARGE(7.0, Double.POSITIVE_INFINITY);

    private final double lowerInclusive;
    private final double upperExclusive;

    MagnitudeCategory(double lowerInclusive, double upperExclusive) {
        this.lowerInclusive = lowerInclusive;
        this.upperExclusive = upperExclusive;
    }

    public double lowerInclusive() {
        return lowerInclusive;
    }

    public double upperExclusive() {
        return upperExclusive;
    }
}
