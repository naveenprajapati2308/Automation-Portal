package com.automationportal.apitesting.common;

import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.engine.jdbc.env.spi.JdbcEnvironment;

/**
 * Spring's default CamelCaseToUnderscoresNamingStrategy lowercases even
 * explicit @Table names, which breaks against the case-sensitive master-spec
 * tables (API_MASTER, API_SCHEDULE, …) on Linux MySQL. Every entity in this
 * codebase declares an explicit @Table, so table names pass through exactly
 * as written; column naming keeps the default snake_case behavior.
 */
public class TablePreservingNamingStrategy
        extends org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy {

    @Override
    public Identifier toPhysicalTableName(Identifier logicalName, JdbcEnvironment context) {
        return logicalName;
    }
}
