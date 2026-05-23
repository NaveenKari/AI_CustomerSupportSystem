package com.customersupport;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock AuthenticationManager authenticationManager;
    @Mock HttpServletRequest httpRequest;
    @Mock HttpSession httpSession;
    @Mock Authentication authentication;

    @InjectMocks AuthController authController;

    @Test
    void login_validCredentials_returns200WithEmail() {
        when(authentication.getName()).thenReturn("admin@example.com");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(httpRequest.getSession(true)).thenReturn(httpSession);

        var response = authController.login(new LoginRequest("admin@example.com", "changeme"), httpRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(Map.of("email", "admin@example.com"));
    }

    @Test
    void login_invalidCredentials_returns401() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad"));

        var response = authController.login(new LoginRequest("admin@example.com", "wrong"), httpRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logout_invalidatesSession() {
        when(httpRequest.getSession(false)).thenReturn(httpSession);

        var response = authController.logout(httpRequest);

        verify(httpSession).invalidate();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void me_authenticated_returnsEmail() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("admin@example.com");

        var response = authController.me(authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(Map.of("email", "admin@example.com"));
    }

    @Test
    void me_notAuthenticated_returns401() {
        var response = authController.me(null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
