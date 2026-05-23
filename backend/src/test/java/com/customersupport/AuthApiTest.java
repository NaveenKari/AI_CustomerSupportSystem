package com.customersupport;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.admin.email=admin@example.com",
    "app.admin.password=changeme",
    "spring.ai.anthropic.api-key=test-key"
})
class AuthApiTest {

    @Autowired MockMvc mockMvc;

    static final String LOGIN_URL  = "/api/auth/login";
    static final String LOGOUT_URL = "/api/auth/logout";
    static final String ME_URL     = "/api/auth/me";
    static final String HEALTH_URL = "/api/health";

    @Test
    void healthEndpoint_isPublic() throws Exception {
        mockMvc.perform(get(HEALTH_URL))
                .andExpect(status().isOk());
    }

    @Test
    void protectedEndpoint_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get(ME_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_validCredentials_returns200AndEmail() throws Exception {
        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@example.com","password":"changeme"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@example.com"));
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@example.com","password":"wrong"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_afterLogin_returnsEmail() throws Exception {
        var session = new MockHttpSession();

        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@example.com","password":"changeme"}
                                """)
                        .session(session))
                .andExpect(status().isOk());

        mockMvc.perform(get(ME_URL).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@example.com"));
    }

    @Test
    void me_afterLogout_returns401() throws Exception {
        var session = new MockHttpSession();

        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@example.com","password":"changeme"}
                                """)
                        .session(session))
                .andExpect(status().isOk());

        mockMvc.perform(post(LOGOUT_URL).session(session))
                .andExpect(status().isOk());

        mockMvc.perform(get(ME_URL).session(session))
                .andExpect(status().isUnauthorized());
    }
}
