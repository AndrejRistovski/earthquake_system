package mk.earthquake_backend;

import mk.earthquake_backend.jobs.EarthquakeRetentionScheduler;
import mk.earthquake_backend.repository.EarthquakeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EarthquakeRetentionSchedulerTest {

    @Mock
    private EarthquakeRepository earthquakeRepository;

    private EarthquakeRetentionScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new EarthquakeRetentionScheduler(earthquakeRepository);
    }

    @Test
    void prune_callsDeleteWithCutoffMinusRetentionDays() {
        // Given
        ReflectionTestUtils.setField(scheduler, "retentionDays", 31L);
        when(earthquakeRepository.deleteByTimeBefore(any(Instant.class))).thenReturn(5);

        // When
        scheduler.prune();

        // Then — capture the Instant passed to deleteByTimeBefore
        ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(earthquakeRepository).deleteByTimeBefore(cutoffCaptor.capture());

        Instant capturedCutoff = cutoffCaptor.getValue();
        Instant expectedCutoff = Instant.now().minus(31, ChronoUnit.DAYS);

        // Allow ±5 seconds tolerance for clock drift during the test
        assertThat(Math.abs(capturedCutoff.toEpochMilli() - expectedCutoff.toEpochMilli()))
                .isLessThan(5_000L);
    }

    @Test
    void prune_returnsNormallyWhenNothingDeleted() {
        // Given — repository returns 0 (nothing deleted)
        ReflectionTestUtils.setField(scheduler, "retentionDays", 31L);
        when(earthquakeRepository.deleteByTimeBefore(any(Instant.class))).thenReturn(0);

        // When / Then — must complete without throwing
        assertThatNoException().isThrownBy(scheduler::prune);
        verify(earthquakeRepository).deleteByTimeBefore(any(Instant.class));
    }

    @Test
    void prune_propagatesRepositoryFailure() {
        // Given — repository throws a DataAccessException (no try/catch in prune())
        ReflectionTestUtils.setField(scheduler, "retentionDays", 31L);
        DataAccessException dbFailure = new QueryTimeoutException("DB timeout");
        when(earthquakeRepository.deleteByTimeBefore(any(Instant.class))).thenThrow(dbFailure);

        // When / Then — exception must propagate unchanged
        assertThatThrownBy(scheduler::prune)
                .isInstanceOf(DataAccessException.class)
                .hasMessage("DB timeout");
    }

    @Test
    void prune_zeroRetentionDays_cutoffEqualsNow() {
        // Given — retentionDays = 0 means cutoff ≈ now
        ReflectionTestUtils.setField(scheduler, "retentionDays", 0L);
        when(earthquakeRepository.deleteByTimeBefore(any(Instant.class))).thenReturn(0);

        // When
        scheduler.prune();

        // Then — captured cutoff is within 5 seconds of now
        ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(earthquakeRepository).deleteByTimeBefore(cutoffCaptor.capture());

        Instant capturedCutoff = cutoffCaptor.getValue();
        assertThat(Math.abs(capturedCutoff.toEpochMilli() - Instant.now().toEpochMilli()))
                .isLessThan(5_000L);
    }
}
