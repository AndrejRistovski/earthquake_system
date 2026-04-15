package mk.earthquake_backend.model.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "earthquakes")
public class Earthquake {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usgs_id", nullable = false, unique = true)
    private String usgsId;

    @Column(name = "magnitude")
    private Double magnitude;

    @Column(name = "mag_type", length = 20)
    private String magType;

    @Column(name = "place")
    private String place;

    @Column(name = "title")
    private String title;

    @Column(name = "time", nullable = false)
    private Instant time;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "depth")
    private Double depth;
}
