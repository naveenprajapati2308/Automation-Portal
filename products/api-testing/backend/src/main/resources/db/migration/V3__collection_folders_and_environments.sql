-- Folders: nested organization within a single collection (Postman's
-- folder tree). NULL parent = top-level folder; requests with NULL
-- folder_id sit directly under the collection ("Ungrouped").
CREATE TABLE collection_folder (
  id BIGINT NOT NULL AUTO_INCREMENT,
  collection_id BIGINT NOT NULL,
  parent_folder_id BIGINT NULL,
  name VARCHAR(150) NOT NULL,
  seq INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_folder_collection (collection_id),
  CONSTRAINT fk_folder_collection FOREIGN KEY (collection_id) REFERENCES api_collection(id) ON DELETE CASCADE,
  CONSTRAINT fk_folder_parent FOREIGN KEY (parent_folder_id) REFERENCES collection_folder(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE collection_request
  ADD COLUMN folder_id BIGINT NULL AFTER collection_id,
  ADD CONSTRAINT fk_colreq_folder FOREIGN KEY (folder_id) REFERENCES collection_folder(id) ON DELETE SET NULL;

-- Environments: named, switchable variable sets scoped to one collection
-- (Dev/QA/Prod). Distinct from api_collection.variables ("collection
-- variables" — always-on base values, e.g. from a Postman import); at
-- execution time the active environment's values override collection
-- variables on key conflict, mirroring Postman's resolution order.
CREATE TABLE collection_environment (
  id BIGINT NOT NULL AUTO_INCREMENT,
  collection_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  variables LONGTEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_env_collection_name (collection_id, name),
  CONSTRAINT fk_env_collection FOREIGN KEY (collection_id) REFERENCES api_collection(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE api_collection
  ADD COLUMN active_environment_id BIGINT NULL AFTER variables,
  ADD CONSTRAINT fk_collection_active_env FOREIGN KEY (active_environment_id) REFERENCES collection_environment(id) ON DELETE SET NULL;
