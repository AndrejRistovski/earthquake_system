package mk.earthquake_backend;

import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.model.exceptions.UsgsApiException;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import mk.earthquake_backend.web.controller.EarthquakeController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EarthquakeController.class)
@ImportAutoConfiguration(org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration.class)
class EarthquakeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EarthquakeService earthquakeService;

    @Test
    void refresh_successfulFetch_returns200WithResults() throws Exception {
        List<EarthquakeResponseDto> mockResult = List.of(
                buildResponseDto("us7000aaa1", 3.5),
                buildResponseDto("us7000aaa2", 5.1)
        );

        when(earthquakeService.fetchAndStoreEarthquakes()).thenReturn(mockResult);

        mockMvc.perform(post("/api/earthquakes/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].usgsId").value("us7000aaa1"))
                .andExpect(jsonPath("$[0].magnitude").value(3.5))
                .andExpect(jsonPath("$[1].usgsId").value("us7000aaa2"))
                .andExpect(jsonPath("$[1].magnitude").value(5.1));
    }

    @Test
    void refresh_usgsApiDown_returns502() throws Exception {
        when(earthquakeService.fetchAndStoreEarthquakes())
                .thenThrow(new UsgsApiException("USGS API unavailable"));

        mockMvc.perform(post("/api/earthquakes/refresh"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.title").value("USGS API Unavailable"))
                .andExpect(jsonPath("$.detail").value("USGS API unavailable"));
    }

    @Test
    void getEarthquakes_noParams_returns200WithResults() throws Exception {
        List<EarthquakeResponseDto> mockResult = List.of(
                buildResponseDto("us7000aaa1", 3.5)
        );

        when(earthquakeService.getStoredEarthquakes(any(), any())).thenReturn(mockResult);

        mockMvc.perform(get("/api/earthquakes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].usgsId").value("us7000aaa1"));
    }

    @Test
    void getEarthquakes_withMinMagnitude_passesParamToService() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/earthquakes")
                        .param("minMagnitude", "4.0"))
                .andExpect(status().isOk());
    }

    @Test
    void getEarthquakes_withAfterParam_passesParamToService() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/earthquakes")
                        .param("after", "2026-04-14T00:00:00Z"))
                .andExpect(status().isOk());
    }

    @Test
    void getEarthquakes_emptyDatabase_returns200WithEmptyList() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/earthquakes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- helper ---

    private EarthquakeResponseDto buildResponseDto(String usgsId, Double magnitude) {
        return new EarthquakeResponseDto(
                1L,
                usgsId,
                magnitude,
                "ml",
                "10km N of Skopje",
                "M " + magnitude + " - Skopje",
                Instant.now(),
                42.00,
                21.43,
                10.0
        );
    }
}
