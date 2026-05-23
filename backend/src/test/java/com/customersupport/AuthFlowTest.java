package com.customersupport;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "app.admin.email=admin@example.com",
    "app.admin.password=changeme",
    "spring.ai.anthropic.api-key=test-key"
})
class AuthFlowTest {

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;

    String base() { return "http://localhost:" + port; }

    @Test
    void fullLoginLogoutFlow() {
        // 1. unauthenticated access is blocked
        var blocked = rest.getForEntity(base() + "/api/auth/me", String.class);
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // 2. login
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var loginBody = """
                {"email":"admin@example.com","password":"changeme"}
                """;
        var loginResp = rest.exchange(
                base() + "/api/auth/login", HttpMethod.POST,
                new HttpEntity<>(loginBody, headers), String.class);
        assertThat(loginResp.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 3. extract session cookie
        List<String> cookies = loginResp.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertThat(cookies).isNotEmpty();
        String sessionCookie = cookies.get(0).split(";")[0];

        // 4. access protected endpoint with session
        var authHeaders = new HttpHeaders();
        authHeaders.set(HttpHeaders.COOKIE, sessionCookie);
        var meResp = rest.exchange(
                base() + "/api/auth/me", HttpMethod.GET,
                new HttpEntity<>(authHeaders), String.class);
        assertThat(meResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(meResp.getBody()).contains("admin@example.com");

        // 5. logout
        var logoutResp = rest.exchange(
                base() + "/api/auth/logout", HttpMethod.POST,
                new HttpEntity<>(authHeaders), String.class);
        assertThat(logoutResp.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 6. session is dead after logout
        var afterLogout = rest.exchange(
                base() + "/api/auth/me", HttpMethod.GET,
                new HttpEntity<>(authHeaders), String.class);
        assertThat(afterLogout.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
