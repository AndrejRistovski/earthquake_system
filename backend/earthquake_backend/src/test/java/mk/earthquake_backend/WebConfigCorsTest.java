package mk.earthquake_backend;

import mk.earthquake_backend.config.WebConfig;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import mk.earthquake_backend.web.controller.EarthquakeController;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EarthquakeController.class)
@Import(WebConfig.class)
class WebConfigCorsTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EarthquakeService earthquakeService;

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:5173", "http://localhost:5174"})
    void preflightRequest_allowedOrigin_isAccepted(String origin) throws Exception {
        mockMvc.perform(options("/api/earthquakes")
                        .header("Origin", origin)
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", origin));
    }
}
