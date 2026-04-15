CREATE TABLE earthquakes
(
    id        BIGSERIAL PRIMARY KEY,
    usgs_id   VARCHAR(255) NOT NULL UNIQUE,
    magnitude DOUBLE PRECISION,
    mag_type  VARCHAR(20),
    place     VARCHAR(255),
    title     VARCHAR(255),
    time      TIMESTAMPTZ  NOT NULL,
    latitude  DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    depth     DOUBLE PRECISION
);