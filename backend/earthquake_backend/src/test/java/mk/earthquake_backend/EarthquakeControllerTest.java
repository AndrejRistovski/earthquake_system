package mk.earthquake_backend;

import mk.earthquake_backend.model.enums.MagnitudeCategory;
import mk.earthquake_backend.model.dto.response.EarthquakeResponseDto;
import mk.earthquake_backend.model.exceptions.UsgsApiException;
import mk.earthquake_backend.service.interfaces.EarthquakeService;
import mk.earthquake_backend.web.controller.EarthquakeController;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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

import static org.assertj.core.api.Assertions.assertThat;
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

        String fromStr = "2026-04-14T00:00:00Z";
        String toStr = "2026-04-21T00:00:00Z";
        Instant expectedFrom = Instant.parse(fromStr);
        Instant expectedTo = Instant.parse(toStr);

        mockMvc.perform(get("/api/earthquakes")
                        .param("from", fromStr)
                        .param("to", toStr))
                .andExpect(status().isOk());

        ArgumentCaptor<Instant> fromCaptor = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> toCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(earthquakeService).getStoredEarthquakes(
                isNull(), isNull(), fromCaptor.capture(), toCaptor.capture(), any());

        assertThat(fromCaptor.getValue()).isEqualTo(expectedFrom);
        assertThat(toCaptor.getValue()).isEqualTo(expectedTo);
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
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("errors/invalid-query-parameter"))
                .andExpect(jsonPath("$.title").value("Invalid Query Parameter"));
    }

    @Test
    void getEarthquakes_invalidDateFormat_returns400() throws Exception {
        mockMvc.perform(get("/api/earthquakes").param("from", "not-a-date"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Invalid Query Parameter"));
    }

    @Test
    void getEarthquakes_serviceThrowsUsgsApi_returns502() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenThrow(new UsgsApiException("USGS down"));

        mockMvc.perform(get("/api/earthquakes"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value(502))
                .andExpect(jsonPath("$.title").value("USGS API Unavailable"))
                .andExpect(jsonPath("$.detail").value("Upstream USGS feed is currently unavailable. Please retry shortly."));
    }

    @Test
    void getEarthquakes_serviceThrowsGeneric_returns500() throws Exception {
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("boom"));

        mockMvc.perform(get("/api/earthquakes"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.title").value("Internal Server Error"))
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred"));
    }

    // --- /api/earthquakes/all (unpaged, for the map) ---

    @Test
    void getAllEarthquakes_returnsBareList() throws Exception {
        Instant fixedTime = Instant.parse("2026-04-14T10:00:00Z");
        EarthquakeResponseDto dto = new EarthquakeResponseDto(
                1L, "us7000aaa1", 3.5, "ml", "10km N of Skopje",
                "M 3.5 - Skopje", fixedTime, 42.00, 21.43, 10.0);

        when(earthquakeService.getAllStoredEarthquakes(any(), any(), any(), any()))
                .thenReturn(List.of(dto, buildResponseDto("us7000aaa2", 5.1)));

        mockMvc.perform(get("/api/earthquakes/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].usgsId").value("us7000aaa1"))
                .andExpect(jsonPath("$[0].magnitude").value(3.5))
                .andExpect(jsonPath("$[0].magType").value("ml"))
                .andExpect(jsonPath("$[0].place").value("10km N of Skopje"))
                .andExpect(jsonPath("$[0].title").value("M 3.5 - Skopje"))
                .andExpect(jsonPath("$[0].latitude").value(42.00))
                .andExpect(jsonPath("$[0].longitude").value(21.43))
                .andExpect(jsonPath("$[0].depth").value(10.0));
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

    @Test
    void getAllEarthquakes_emptyResult_returnsEmptyArray() throws Exception {
        when(earthquakeService.getAllStoredEarthquakes(any(), any(), any(), any()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/earthquakes/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getEarthquakes_responseDtoShape_includesAllFields() throws Exception {
        Instant fixedTime = Instant.parse("2026-04-14T10:00:00Z");
        EarthquakeResponseDto dto = new EarthquakeResponseDto(
                42L, "us7000xyz9", 6.1, "mw", "30km W of Bitola",
                "M 6.1 - Bitola", fixedTime, 41.01, 20.80, 12.5);

        Page<EarthquakeResponseDto> page = new PageImpl<>(
                List.of(dto), PageRequest.of(0, 20), 1);
        when(earthquakeService.getStoredEarthquakes(any(), any(), any(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/earthquakes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(42))
                .andExpect(jsonPath("$.content[0].usgsId").value("us7000xyz9"))
                .andExpect(jsonPath("$.content[0].magnitude").value(6.1))
                .andExpect(jsonPath("$.content[0].magType").value("mw"))
                .andExpect(jsonPath("$.content[0].place").value("30km W of Bitola"))
                .andExpect(jsonPath("$.content[0].title").value("M 6.1 - Bitola"))
                .andExpect(jsonPath("$.content[0].latitude").value(41.01))
                .andExpect(jsonPath("$.content[0].longitude").value(20.80))
                .andExpect(jsonPath("$.content[0].depth").value(12.5));
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
