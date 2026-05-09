package mk.earthquake_backend;

import mk.earthquake_backend.model.enums.MagnitudeCategory;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import mk.earthquake_backend.web.controller.EarthquakeController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EarthquakeController.class)
@ImportAutoConfiguration(org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration.class)
class EarthquakeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EarthquakeService earthquakeService;

    // --- /api/earthquakes (paginated) ---

    @Test
    void getEarthquakes_noParams_returnsPagedResponseShape() throws Exception {
        Page<EarthquakeResponseDto> mockPage = new PageImpl<>(
                List.of(buildResponseDto("us7000aaa1", 3.5)),
                PageRequest.of(0, 20),
                1
        );
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenReturn(mockPage);

        mockMvc.perform(get("/api/earthquakes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].usgsId").value("us7000aaa1"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void getEarthquakes_withMinMagnitude_passesParamToService() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/earthquakes").param("minMagnitude", "4.0"))
                .andExpect(status().isOk());

        verify(earthquakeService).getStoredEarthquakes(eq(4.0), isNull(), isNull(), isNull(), any());
    }

    @Test
    void getEarthquakes_withCategories_passesEnumSetToService() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/earthquakes")
                        .param("categories", "SMALL", "LARGE"))
                .andExpect(status().isOk());

        verify(earthquakeService).getStoredEarthquakes(
                isNull(),
                eq(Set.of(MagnitudeCategory.SMALL, MagnitudeCategory.LARGE)),
                isNull(), isNull(), any());
    }

    @Test
    void getEarthquakes_withFromAndTo_passesParamsToService() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/earthquakes")
                        .param("from", "2026-04-14T00:00:00Z")
                        .param("to", "2026-04-21T00:00:00Z"))
                .andExpect(status().isOk());
    }

    @Test
    void getEarthquakes_withPageAndSize_passesPageableToService() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/earthquakes")
                        .param("page", "2")
                        .param("size", "5"))
                .andExpect(status().isOk());

        verify(earthquakeService).getStoredEarthquakes(
                isNull(), isNull(), isNull(), isNull(),
                org.mockito.ArgumentMatchers.argThat(p -> p.getPageNumber() == 2 && p.getPageSize() == 5));
    }

    @Test
    void getEarthquakes_emptyDatabase_returns200WithEmptyContent() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/earthquakes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void getEarthquakes_negativeMagnitude_returns400() throws Exception {
        mockMvc.perform(get("/api/earthquakes").param("minMagnitude", "-1.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation Failed"));
    }

    @Test
    void getEarthquakes_invalidCategoryEnum_returns400() throws Exception {
        mockMvc.perform(get("/api/earthquakes").param("categories", "HUGE"))
                .andExpect(status().isBadRequest());
    }

    // --- /api/earthquakes/all (unpaged, for the map) ---

    @Test
    void getAllEarthquakes_returnsBareList() throws Exception {
        when(earthquakeService.getAllStoredEarthquakes(any(), any(), any(), any()))
                .thenReturn(List.of(
                        buildResponseDto("us7000aaa1", 3.5),
                        buildResponseDto("us7000aaa2", 5.1)
                ));

        mockMvc.perform(get("/api/earthquakes/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].usgsId").value("us7000aaa1"));
    }

    @Test
    void getAllEarthquakes_withFilters_passesThrough() throws Exception {
        when(earthquakeService.getAllStoredEarthquakes(any(), any(), any(), any()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/earthquakes/all")
                        .param("minMagnitude", "2.5")
                        .param("categories", "MEDIUM"))
                .andExpect(status().isOk());

        verify(earthquakeService).getAllStoredEarthquakes(
                eq(2.5),
                eq(Set.of(MagnitudeCategory.MEDIUM)),
                isNull(), isNull());
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
