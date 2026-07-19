-- Collection-scoped variables (Postman calls these "collection variables") —
-- {{key}} placeholders in a collection request's URL/headers/params/body/auth
-- are resolved against these at execution time. Populated automatically on
-- Postman import from the collection's top-level "variable" array.
ALTER TABLE api_collection
  ADD COLUMN variables LONGTEXT NULL AFTER description;
