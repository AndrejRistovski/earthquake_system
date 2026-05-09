package mk.earthquake_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class EarthquakeBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(EarthquakeBackendApplication.class, args);
    }

}
