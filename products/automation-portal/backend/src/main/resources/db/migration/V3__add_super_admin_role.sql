INSERT INTO roles (code, name, description)
SELECT 'SUPER_ADMIN', 'Super Admin', 'Unrestricted platform administration'
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE code = 'SUPER_ADMIN'
);
