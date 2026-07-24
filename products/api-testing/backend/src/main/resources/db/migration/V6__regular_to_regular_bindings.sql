-- =====================================================================
-- V6: Allow a Regular API binding to source its value from another
-- Regular API's response, not just from a Base API. Needed for chains
-- deeper than one hop (e.g. Login <- Register Submit <- Verify OTP <-
-- Send OTP), where the middle link is itself dynamic and can't be a
-- Base API (Base APIs never get {{variable}} substitution).
--
-- base_api_id becomes nullable: a consumer binding row now sets exactly
-- one of base_api_id / source_regular_api_id as its source. Rows where
-- regular_api_id IS NULL (extraction definitions) are unaffected and
-- keep using base_api_id as before.
-- =====================================================================

ALTER TABLE BASE_API_MAPPING
  MODIFY COLUMN base_api_id BIGINT NULL,
  ADD COLUMN source_regular_api_id BIGINT NULL AFTER base_api_id,
  ADD KEY idx_binding_source_regular (source_regular_api_id),
  ADD CONSTRAINT fk_binding_source_regular FOREIGN KEY (source_regular_api_id) REFERENCES API_MASTER(id) ON DELETE CASCADE,
  DROP KEY uq_binding,
  ADD UNIQUE KEY uq_binding (regular_api_id, base_api_id, source_regular_api_id, variable_name);
