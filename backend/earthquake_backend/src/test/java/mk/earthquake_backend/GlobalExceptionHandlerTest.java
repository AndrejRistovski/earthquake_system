package mk.earthquake_backend;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import mk.earthquake_backend.model.exceptions.UsgsApiException;
import mk.earthquake_backend.web.handler.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.Set;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void usgsApiException_returns502_withProblemDetail() throws Exception {
        mockMvc.perform(get("/test/usgs-error"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value(502))
                .andExpect(jsonPath("$.title").value("USGS API Unavailable"))
                .andExpect(jsonPath("$.detail").value("Upstream USGS feed is currently unavailable. Please retry shortly."));
    }

    @Test
    void genericException_returns500_withGenericMessage() throws Exception {
        mockMvc.perform(get("/test/generic-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.title").value("Internal Server Error"))
                // Handler intentionally hides the real message for security
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred"));
    }

    @Test
    void constraintViolation_returns400_withJoinedViolations() throws Exception {
        mockMvc.perform(get("/test/constraint-violation"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Validation Failed"))
                // Both violation messages are joined by ", "
                .andExpect(jsonPath("$.detail", containsString("must not be null")))
                .andExpect(jsonPath("$.detail", containsString("must be positive")));
    }

    @Test
    void methodArgumentTypeMismatch_returns400_withParamName() throws Exception {
        mockMvc.perform(get("/test/type-mismatch"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Invalid Query Parameter"))
                // Detail mentions the parameter name but NOT the user-supplied value
                .andExpect(jsonPath("$.detail", containsString("from")));
    }

    // -----------------------------------------------------------------------
    // Test-only controller — never deployed, exists only to trigger each handler
    // -----------------------------------------------------------------------

    @RestController
    @RequestMapping("/test")
    static class ThrowingController {

        @GetMapping("/usgs-error")
        public String usgsError() {
            throw new UsgsApiException("USGS unreachable");
        }

        @GetMapping("/generic-error")
        public String genericError() {
            throw new RuntimeException("internal");
        }

        @GetMapping("/constraint-violation")
        public String constraintViolation() {
            ConstraintViolation<?> v1 = buildViolation("field1", "must not be null");
            ConstraintViolation<?> v2 = buildViolation("field2", "must be positive");
            throw new ConstraintViolationException(Set.of(v1, v2));
        }

        @GetMapping("/type-mismatch")
        public String typeMismatch() {
            org.springframework.core.MethodParameter methodParam = buildMethodParameter();
            MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                    "bogus", Instant.class, "from", methodParam,
                    new IllegalArgumentException("bad instant"));
            throw ex;
        }

        @SuppressWarnings("unchecked")
        private static ConstraintViolation<?> buildViolation(String property, String message) {
            ConstraintViolation<Object> cv = Mockito.mock(ConstraintViolation.class);
            Path path = Mockito.mock(Path.class);
            Mockito.when(path.toString()).thenReturn(property);
            Mockito.when(cv.getPropertyPath()).thenReturn(path);
            Mockito.when(cv.getMessage()).thenReturn(message);
            return cv;
        }

        private static org.springframework.core.MethodParameter buildMethodParameter() {
            try {
                java.lang.reflect.Method m = ThrowingController.class.getDeclaredMethod("typeMismatch");
                return new org.springframework.core.MethodParameter(m, -1);
            } catch (NoSuchMethodException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
