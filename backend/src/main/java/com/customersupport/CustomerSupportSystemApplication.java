package com.customersupport;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.ai.vectorstore.pgvector.autoconfigure.PgVectorStoreAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

// PgVectorStoreAutoConfiguration remains excluded until an EmbeddingModel bean is added
// (Anthropic/Claude does not provide an embeddings API — needs OpenAI or another provider)
@SpringBootApplication(exclude = {
    PgVectorStoreAutoConfiguration.class
})
@EnableScheduling
public class CustomerSupportSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(CustomerSupportSystemApplication.class, args);
    }

}
