package mk.earthquake_backend.web.handler;

import mk.earthquake_backend.model.exceptions.UsgsApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.net.URI;
import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(UsgsApiException.class)
    public ProblemDetail handleUsgsApiException(UsgsApiException ex) {
        log.error("USGS API error: {}", ex.getMessage(), ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY,
                ex.getMessage()
        );
        problem.setTitle("USGS API Unavailable");
        problem.setType(URI.create("errors/usgs-api-unavailable"));
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGenericException(Exception ex) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred"
        );
        problem.setTitle("Internal Server Error");
        problem.setType(URI.create("errors/internal-server-error"));
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Invalid query parameter [{}]: {}", ex.getName(), ex.getValue());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Invalid value '" + ex.getValue() + "' for parameter '" + ex.getName() + "'"
        );
        problem.setTitle("Invalid Query Parameter");
        problem.setType(URI.create("errors/invalid-query-parameter"));
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }
}
