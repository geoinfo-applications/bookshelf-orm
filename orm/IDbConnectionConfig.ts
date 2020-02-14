"use strict";

export interface IDbConnectionProperties {
    database: string;
    port: number;
    host: string;
    user: string;
    password: string;
    pool?: Partial<{
        min: number;
        max: number;
        idleTimeoutMillis: number;
        reapIntervalMillis: number;
    }>;
}

export default interface IDbConnectionConfig {
    projectName: string;
    debug: boolean;
    db: IDbConnectionProperties;
}
