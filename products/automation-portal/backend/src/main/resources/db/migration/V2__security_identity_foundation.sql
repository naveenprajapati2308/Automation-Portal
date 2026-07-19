ALTER TABLE users
    ADD COLUMN mobile_number VARCHAR(30) NULL,
    ADD COLUMN designation VARCHAR(120) NULL,
    ADD COLUMN organization VARCHAR(180) NULL,
    ADD COLUMN profile_image_path VARCHAR(1000) NULL,
    ADD COLUMN last_login TIMESTAMP NULL,
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN auth_provider VARCHAR(40) NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN pending_email VARCHAR(160) NULL;

UPDATE users SET email_verified = TRUE WHERE username = 'admin';

CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE refresh_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    replaced_by VARCHAR(255),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE otp_verifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(80),
    email VARCHAR(160) NOT NULL,
    otp_code VARCHAR(120) NOT NULL,
    purpose VARCHAR(60) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    username VARCHAR(80),
    action VARCHAR(80) NOT NULL,
    details VARCHAR(1000),
    ip_address VARCHAR(80),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO roles (code, name, description) VALUES
    ('ADMIN', 'Admin', 'Full portal administration'),
    ('QA_LEAD', 'QA Lead', 'Quality lead and approval responsibilities'),
    ('AUTOMATION_ENGINEER', 'Automation Engineer', 'Automation execution and maintenance'),
    ('VIEWER', 'Viewer', 'Read-only portal access');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = u.role
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_otp_email_purpose ON otp_verifications(email, purpose);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);
