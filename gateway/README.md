# Testrix Gateway (planned — Phase 2/3)

nginx single entry point for the whole platform (single origin ⇒ one JWT
cookie ⇒ SSO, zero CORS):

```
/            → platform/shell
/automation/ → automation portal UI     /automation/api/ → its backend
/apitest/    → api testing UI           /apitest/api/    → its backend
/genai/      → GenAI chat API
/api/platform/ → core-service
```
